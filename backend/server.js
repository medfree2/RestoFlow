const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

require("dotenv").config();

const Product = require("./models/Product");
const Order = require("./models/Order");
const OrderDetail = require("./models/OrderDetail");
const StockMovement = require("./models/StockMovement");
const Customer = require("./models/Customer");
const Reservation = require("./models/Reservation");
const User = require("./models/User");

const app = express();

const PORT = process.env.PORT || 5000;

// ======================================================
// GLOBAL MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());

// ======================================================
// ENV CHECK
// ======================================================

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing from .env");
}

if (!process.env.OPENROUTER_API_KEY) {
  console.warn("⚠ OPENROUTER_API_KEY is missing from .env");
}

// ======================================================
// MONGODB
// ======================================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");

    // ==================================================
    // DEFAULT ADMIN ACCOUNT
    // Login: admin
    // Password: admin
    // Stored email remains admin@restaurant.com
    // ==================================================

    try {
      const adminEmail = "admin@restaurant.com";
      const adminPassword = "admin";

      let adminUser = await User.findOne({
        $or: [
          { email: adminEmail },
          { role: "admin" },
        ],
      });

      const hashedPassword = await bcrypt.hash(
        adminPassword,
        12
      );

      if (!adminUser) {
        adminUser = await User.create({
          name: "Admin",
          email: adminEmail,
          password: hashedPassword,
          role: "admin",
          active: true,
        });

        console.log(
          "✅ Default admin account created: admin / admin"
        );
      } else {
        adminUser.name = "Admin";
        adminUser.email = adminEmail;
        adminUser.password = hashedPassword;
        adminUser.role = "admin";
        adminUser.active = true;

        await adminUser.save();

        console.log(
          "✅ Admin credentials synchronized: admin / admin"
        );
      }
    } catch (adminError) {
      console.error(
        "❌ Default admin setup error:",
        adminError.message
      );
    }
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

// ======================================================
// HELPERS
// ======================================================

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ======================================================
// AUTH MIDDLEWARE
// ======================================================

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentification requise",
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Token invalide",
      });
    }

    const decoded = jwt.verify(
      parts[1],
      process.env.JWT_SECRET
    );

    const user = await User.findById(
      decoded.userId
    ).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Utilisateur introuvable",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message: "Compte désactivé",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session invalide ou expirée",
    });
  }
};

// ======================================================
// ADMIN MIDDLEWARE
// ======================================================

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Accès réservé à l'administrateur",
    });
  }

  next();
};

// ======================================================
// TEST ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "Restaurant Management API is working!",
  });
});

// ======================================================
// REGISTER
// ======================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
    } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message:
          "Nom, email et mot de passe sont obligatoires",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Le mot de passe doit contenir au moins 6 caractères",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Cet email est déjà utilisé",
      });
    }

    const userCount = await User.countDocuments();

    let finalRole = "employee";

    if (userCount === 0) {
      finalRole = "admin";
    } else {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(403).json({
          message:
            "Seul un administrateur peut créer de nouveaux utilisateurs",
        });
      }

      const parts = authHeader.split(" ");

      if (
        parts.length !== 2 ||
        parts[0] !== "Bearer"
      ) {
        return res.status(401).json({
          message: "Token invalide",
        });
      }

      let decoded;

      try {
        decoded = jwt.verify(
          parts[1],
          process.env.JWT_SECRET
        );
      } catch {
        return res.status(401).json({
          message: "Session invalide ou expirée",
        });
      }

      const admin = await User.findById(
        decoded.userId
      );

      if (
        !admin ||
        !admin.active ||
        admin.role !== "admin"
      ) {
        return res.status(403).json({
          message:
            "Accès réservé à l'administrateur",
        });
      }

      const roles = [
        "admin",
        "manager",
        "employee",
      ];

      finalRole = roles.includes(role)
        ? role
        : "employee";
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: finalRole,
      active: true,
    });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.status(201).json({
      message:
        userCount === 0
          ? "Compte administrateur créé avec succès"
          : "Utilisateur créé avec succès",

      token,

      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Impossible de créer l'utilisateur",
      error: error.message,
    });
  }
});

// ======================================================
// LOGIN
// ======================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      email,
      username,
      password,
    } = req.body;

    const loginValue = (
      username ||
      email ||
      ""
    )
      .trim()
      .toLowerCase();

    if (!loginValue || !password) {
      return res.status(400).json({
        message:
          "Identifiant et mot de passe obligatoires",
      });
    }

    // "admin" is accepted as an alias for the
    // stored administrator email.
    const normalizedLogin =
      loginValue === "admin"
        ? "admin@restaurant.com"
        : loginValue;

    const user = await User.findOne({
      email: normalizedLogin,
    });

    if (!user) {
      return res.status(401).json({
        message:
          "Identifiant ou mot de passe incorrect",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message:
          "Votre compte est désactivé",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message:
          "Identifiant ou mot de passe incorrect",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.json({
      message: "Connexion réussie",

      token,

      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Erreur lors de la connexion",
      error: error.message,
    });
  }
});

// ======================================================
// CURRENT USER
// ======================================================

app.get(
  "/api/auth/me",
  authenticateToken,
  (req, res) => {
    res.json({
      user: req.user,
    });
  }
);

// ======================================================
// USERS
// ======================================================

app.get(
  "/api/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const users = await User.find()
        .select("-password")
        .sort({
          createdAt: -1,
        });

      res.json(users);
    } catch (error) {
      res.status(500).json({
        message:
          "Impossible de charger les utilisateurs",
        error: error.message,
      });
    }
  }
);

app.put(
  "/api/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        role,
        active,
        name,
      } = req.body;

      const user = await User.findById(
        req.params.id
      );

      if (!user) {
        return res.status(404).json({
          message:
            "Utilisateur introuvable",
        });
      }

      const allowedRoles = [
        "admin",
        "manager",
        "employee",
      ];

      if (
        role &&
        allowedRoles.includes(role)
      ) {
        user.role = role;
      }

      if (typeof active === "boolean") {
        user.active = active;
      }

      if (name?.trim()) {
        user.name = name.trim();
      }

      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      });
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de modifier l'utilisateur",
        error: error.message,
      });
    }
  }
);

// ======================================================
// PROTECT RESTAURANT API
// ======================================================

app.use("/api", authenticateToken);

// ======================================================
// AI - MENU DESCRIPTION
// ======================================================

app.post(
  "/api/ai/menu-description",
  async (req, res) => {
    try {
      const {
        name,
        category,
        ingredients,
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          message:
            "Le nom du plat est obligatoire",
        });
      }

      if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({
          message:
            "OPENROUTER_API_KEY n'est pas configurée",
        });
      }

      const prompt = `
Tu es un assistant spécialisé dans la restauration.

Génère une description courte, professionnelle et appétissante pour le plat suivant.

Nom : ${name.trim()}
Catégorie : ${category?.trim() || "Non précisée"}
Ingrédients : ${ingredients?.trim() || "Non précisés"}

Contraintes :
- 1 ou 2 phrases maximum.
- Ton professionnel et appétissant.
- Description naturelle.
- Ne pas inventer d'ingrédients lorsqu'ils ne sont pas indiqués.
- Ne pas ajouter de prix.
- Ne pas utiliser de titre.
- Répondre uniquement avec la description.
`;

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openai/gpt-4o-mini",

          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.7,
        },
        {
          headers: {
            Authorization:
              `Bearer ${process.env.OPENROUTER_API_KEY}`,

            "Content-Type":
              "application/json",
          },

          timeout: 30000,
        }
      );

      const description =
        response.data
          ?.choices?.[0]
          ?.message?.content
          ?.trim();

      if (!description) {
        return res.status(500).json({
          message:
            "L'IA n'a retourné aucune description",
        });
      }

      res.json({
        description,
      });
    } catch (error) {
      console.error(
        "AI ERROR:",
        error.response?.data ||
          error.message
      );

      res.status(
        error.response?.status || 500
      ).json({
        message:
          "Impossible de générer la description avec l'IA",

        error:
          error.response?.data
            ?.error?.message ||
          error.message,
      });
    }
  }
);

// ======================================================
// AI - CUSTOMER DISH RECOMMENDATIONS
// ======================================================

app.get(
  "/api/ai/recommendations/:customerId",
  async (req, res) => {
    try {
      const {
        customerId,
      } = req.params;

      // ----------------------------------------------
      // VALIDATE CUSTOMER
      // ----------------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          customerId
        )
      ) {
        return res.status(400).json({
          message:
            "Identifiant client invalide",
        });
      }

      const customer =
        await Customer.findById(
          customerId
        );

      if (!customer) {
        return res.status(404).json({
          message: "Client introuvable",
        });
      }

      // ----------------------------------------------
      // CUSTOMER ORDER HISTORY
      // ----------------------------------------------

      const orders = await Order.find({
        customer: customer._id,

        status: {
          $ne: "Annulée",
        },
      }).sort({
        createdAt: -1,
      });

      // ----------------------------------------------
      // AVAILABLE PRODUCTS
      // ----------------------------------------------

      const availableProducts =
        await Product.find({
          stock: {
            $gt: 0,
          },
        });

      if (availableProducts.length === 0) {
        return res.json({
          customer: {
            _id: customer._id,
            name: customer.name,
          },

          orderCount: orders.length,

          favoriteCategories: [],
          favoriteProducts: [],
          recommendations: [],

          aiMessage:
            "Aucun plat n'est disponible actuellement.",
        });
      }

      // ----------------------------------------------
      // BUILD PRODUCT LOOKUP
      // ----------------------------------------------

      const productLookup = new Map();

      availableProducts.forEach(
        (product) => {
          productLookup.set(
            product._id.toString(),
            product
          );
        }
      );

      // ----------------------------------------------
      // CUSTOMER STATISTICS
      // ----------------------------------------------

      const productStats = {};
      const categoryStats = {};

      const orderedProductIds =
        new Set();

      for (const order of orders) {
        for (
          const item of order.items || []
        ) {
          const quantity =
            Number(item.quantity) || 0;

          const productId =
            item.product?.toString();

          if (productId) {
            orderedProductIds.add(
              productId
            );
          }

          const productKey =
            productId ||
            item.name ||
            "unknown";

          if (!productStats[productKey]) {
            productStats[productKey] = {
              productId:
                productId || null,

              name:
                item.name ||
                "Produit",

              quantity: 0,
            };
          }

          productStats[
            productKey
          ].quantity += quantity;

          if (productId) {
            let product =
              productLookup.get(
                productId
              );

            // The product may currently be out of stock,
            // but we still want its category for history.
            if (!product) {
              product =
                await Product.findById(
                  productId
                );
            }

            if (product?.category) {
              if (
                !categoryStats[
                  product.category
                ]
              ) {
                categoryStats[
                  product.category
                ] = 0;
              }

              categoryStats[
                product.category
              ] += quantity;
            }
          }
        }
      }

      // ----------------------------------------------
      // FAVORITE PRODUCTS
      // ----------------------------------------------

      const favoriteProducts =
        Object.values(productStats)
          .sort(
            (a, b) =>
              b.quantity -
              a.quantity
          )
          .slice(0, 5);

      // ----------------------------------------------
      // FAVORITE CATEGORIES
      // ----------------------------------------------

      const favoriteCategories =
        Object.entries(
          categoryStats
        )
          .sort(
            (a, b) =>
              b[1] - a[1]
          )
          .map(
            ([
              category,
              quantity,
            ]) => ({
              category,
              quantity,
            })
          )
          .slice(0, 5);

      // ----------------------------------------------
      // SCORE PRODUCTS
      // ----------------------------------------------

      const scoredProducts =
        availableProducts.map(
          (product) => {
            let score = 0;

            const reasons = [];

            const categoryIndex =
              favoriteCategories.findIndex(
                (item) =>
                  item.category ===
                  product.category
              );

            // Favorite category
            if (categoryIndex === 0) {
              score += 50;

              reasons.push(
                "Correspond à la catégorie préférée du client"
              );
            } else if (
              categoryIndex > 0
            ) {
              score += Math.max(
                30 -
                  categoryIndex * 5,
                10
              );

              reasons.push(
                "Correspond aux habitudes du client"
              );
            }

            // Product already ordered
            const alreadyOrdered =
              orderedProductIds.has(
                product._id.toString()
              );

            if (alreadyOrdered) {
              const stat =
                productStats[
                  product._id.toString()
                ];

              const orderedQuantity =
                stat?.quantity || 0;

              score += Math.min(
                orderedQuantity * 8,
                40
              );

              reasons.push(
                `Déjà commandé ${orderedQuantity} fois`
              );
            } else {
              score += 12;

              reasons.push(
                "Nouveau plat à découvrir"
              );
            }

            // Slight availability bonus
            if (
              Number(product.stock) > 10
            ) {
              score += 5;
            }

            return {
              productId:
                product._id,

              name:
                product.name,

              category:
                product.category,

              price:
                product.price,

              stock:
                product.stock,

              description:
                product.description || "",

              ingredients:
                product.ingredients || "",

              score,

              alreadyOrdered,

              reason:
                reasons.join(". "),
            };
          }
        );

      // ----------------------------------------------
      // TOP RECOMMENDATIONS
      // ----------------------------------------------

      let recommendations =
        scoredProducts
          .sort(
            (a, b) =>
              b.score - a.score
          )
          .slice(0, 5);

      // ----------------------------------------------
      // NEW CUSTOMER
      // ----------------------------------------------

      if (orders.length === 0) {
        recommendations =
          [...availableProducts]
            .sort(
              (a, b) =>
                Number(b.stock) -
                Number(a.stock)
            )
            .slice(0, 5)
            .map(
              (product) => ({
                productId:
                  product._id,

                name:
                  product.name,

                category:
                  product.category,

                price:
                  product.price,

                stock:
                  product.stock,

                description:
                  product.description ||
                  "",

                ingredients:
                  product.ingredients ||
                  "",

                score: 0,

                alreadyOrdered:
                  false,

                reason:
                  "Suggestion pour découvrir le menu",
              })
            );
      }

      // ----------------------------------------------
      // AI EXPLANATION
      // ----------------------------------------------

      let aiMessage = "";

      if (
        process.env.OPENROUTER_API_KEY &&
        recommendations.length > 0
      ) {
        try {
          const recommendationList =
            recommendations
              .map(
                (item, index) =>
                  `${index + 1}. ${item.name} - ${item.category} - ${item.price} DH`
              )
              .join("\n");

          const favorites =
            favoriteProducts.length
              ? favoriteProducts
                  .map(
                    (item) =>
                      `${item.name} (${item.quantity})`
                  )
                  .join(", ")
              : "Aucun historique";

          const categories =
            favoriteCategories.length
              ? favoriteCategories
                  .map(
                    (item) =>
                      item.category
                  )
                  .join(", ")
              : "Aucune";

          const prompt = `
Tu es un assistant intelligent pour un restaurant.

Client : ${customer.name}

Nombre de commandes :
${orders.length}

Plats commandés le plus souvent :
${favorites}

Catégories préférées :
${categories}

Plats recommandés :
${recommendationList}

Écris une explication très courte et professionnelle
de la recommandation.

Contraintes :
- Maximum 2 phrases.
- Ne pas inventer d'informations.
- Ne pas inventer d'allergies ou de préférences.
- Ne pas modifier les recommandations.
- Répondre uniquement avec l'explication.
`;

          const aiResponse =
            await axios.post(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                model:
                  "openai/gpt-4o-mini",

                messages: [
                  {
                    role: "user",
                    content: prompt,
                  },
                ],

                temperature: 0.5,
              },
              {
                headers: {
                  Authorization:
                    `Bearer ${process.env.OPENROUTER_API_KEY}`,

                  "Content-Type":
                    "application/json",
                },

                timeout: 30000,
              }
            );

          aiMessage =
            aiResponse.data
              ?.choices?.[0]
              ?.message?.content
              ?.trim() || "";
        } catch (aiError) {
          console.error(
            "Recommendation AI error:",
            aiError.response?.data ||
              aiError.message
          );
        }
      }

      // ----------------------------------------------
      // RESPONSE
      // ----------------------------------------------

      res.json({
        customer: {
          _id: customer._id,
          name: customer.name,
          phone:
            customer.phone || "",
          email:
            customer.email || "",
        },

        orderCount:
          orders.length,

        favoriteCategories,

        favoriteProducts,

        recommendations,

        aiMessage:
          aiMessage ||
          (orders.length === 0
            ? "Ce client n'a pas encore d'historique. Les suggestions permettent de découvrir le menu."
            : "Les suggestions sont basées sur l'historique des commandes du client."),
      });
    } catch (error) {
      console.error(
        "RECOMMENDATION ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Impossible de générer les recommandations",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// AI - SALES FORECAST
// ======================================================

app.get(
  "/api/ai/sales-forecast",
  async (req, res) => {
    try {
      const orders = await Order.find({
        status: "Terminée",
      }).sort({
        createdAt: 1,
      });

      if (orders.length === 0) {
        return res.json({
          historicalDays: [],
          forecast: [],
          summary: {
            totalHistoricalSales: 0,
            averageDailySales: 0,
            recentAverage: 0,
            predictedNext7Days: 0,
            trend: "stable",
            trendPercentage: 0,
          },
          aiMessage:
            "Pas encore assez de commandes terminées pour calculer une prévision.",
        });
      }

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);

      const historicalDays = [];

      for (let i = 0; i < 30; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        day.setHours(0, 0, 0, 0);

        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const dailyOrders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= day && orderDate < nextDay;
        });

        const sales = dailyOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        historicalDays.push({
          date: day.toISOString().slice(0, 10),
          label: day.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
          }),
          sales: Math.round(sales * 100) / 100,
          orders: dailyOrders.length,
        });
      }

      const totalHistoricalSales = historicalDays.reduce(
        (sum, day) => sum + day.sales,
        0
      );

      const averageDailySales =
        totalHistoricalSales / historicalDays.length;

      const recentDays = historicalDays.slice(-7);
      const recentAverage =
        recentDays.reduce((sum, day) => sum + day.sales, 0) /
        recentDays.length;

      const previousDays = historicalDays.slice(-14, -7);
      const previousAverage = previousDays.length
        ? previousDays.reduce((sum, day) => sum + day.sales, 0) /
          previousDays.length
        : 0;

      let trend = "stable";
      let trendPercentage = 0;

      if (previousAverage > 0) {
        trendPercentage =
          ((recentAverage - previousAverage) / previousAverage) * 100;

        if (trendPercentage > 5) {
          trend = "hausse";
        } else if (trendPercentage < -5) {
          trend = "baisse";
        }
      } else if (recentAverage > 0) {
        trend = "hausse";
      }

      const weekdayStats = {};

      historicalDays.forEach((day) => {
        const date = new Date(`${day.date}T12:00:00`);
        const weekday = date.getDay();

        if (!weekdayStats[weekday]) {
          weekdayStats[weekday] = {
            total: 0,
            days: 0,
          };
        }

        weekdayStats[weekday].total += day.sales;
        weekdayStats[weekday].days += 1;
      });

      const forecast = [];

      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        futureDate.setHours(12, 0, 0, 0);

        const weekday = futureDate.getDay();
        const weekdayData = weekdayStats[weekday];

        let weekdayAverage = averageDailySales;

        if (weekdayData && weekdayData.days > 0) {
          weekdayAverage =
            weekdayData.total / weekdayData.days;
        }

        let predictedSales =
          weekdayAverage * 0.5 +
          recentAverage * 0.3 +
          averageDailySales * 0.2;

        const limitedTrend = Math.max(
          -20,
          Math.min(20, trendPercentage)
        );

        predictedSales *= 1 + limitedTrend / 100;
        predictedSales = Math.max(0, predictedSales);

        forecast.push({
          date: futureDate.toISOString().slice(0, 10),
          label: futureDate.toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          }),
          predictedSales:
            Math.round(predictedSales * 100) / 100,
        });
      }

      const predictedNext7Days = forecast.reduce(
        (sum, day) => sum + day.predictedSales,
        0
      );

      let aiMessage = "";

      if (process.env.OPENROUTER_API_KEY) {
        try {
          const forecastText = forecast
            .map(
              (day) =>
                `${day.label}: ${day.predictedSales.toFixed(2)} DH`
            )
            .join("\n");

          const prompt = `
Tu es un assistant d'analyse des ventes pour un restaurant.

Voici les statistiques :

Chiffre d'affaires des 30 derniers jours :
${totalHistoricalSales.toFixed(2)} DH

Moyenne quotidienne :
${averageDailySales.toFixed(2)} DH

Moyenne des 7 derniers jours :
${recentAverage.toFixed(2)} DH

Tendance :
${trend}

Variation :
${trendPercentage.toFixed(1)} %

Prévisions pour les 7 prochains jours :

${forecastText}

Total prévu :
${predictedNext7Days.toFixed(2)} DH

Donne une analyse courte et professionnelle.

Contraintes :
- maximum 3 phrases
- expliquer la tendance
- donner un conseil utile au restaurant
- ne pas inventer de données
- répondre uniquement avec l'analyse
`;

          const aiResponse = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              model: "openai/gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
              temperature: 0.4,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );

          aiMessage =
            aiResponse.data?.choices?.[0]?.message?.content?.trim() ||
            "";
        } catch (aiError) {
          console.error(
            "SALES FORECAST AI ERROR:",
            aiError.response?.data || aiError.message
          );
        }
      }

      res.json({
        historicalDays,
        forecast,
        summary: {
          totalHistoricalSales:
            Math.round(totalHistoricalSales * 100) / 100,
          averageDailySales:
            Math.round(averageDailySales * 100) / 100,
          recentAverage:
            Math.round(recentAverage * 100) / 100,
          predictedNext7Days:
            Math.round(predictedNext7Days * 100) / 100,
          trend,
          trendPercentage:
            Math.round(trendPercentage * 10) / 10,
        },
        aiMessage:
          aiMessage ||
          `La prévision estime ${predictedNext7Days.toFixed(
            2
          )} DH de ventes pour les 7 prochains jours.`,
      });
    } catch (error) {
      console.error("SALES FORECAST ERROR:", error);

      res.status(500).json({
        message:
          "Impossible de calculer les prévisions de ventes",
        error: error.message,
      });
    }
  }
);


// ======================================================
// AI - DAILY MENU FROM AVAILABLE STOCK
// ======================================================

app.get(
  "/api/ai/daily-menu",
  async (req, res) => {
    try {
      const products = await Product.find().sort({
        category: 1,
        name: 1,
      });

      if (!products.length) {
        return res.status(404).json({
          message:
            "Aucun produit trouvé dans le stock.",
        });
      }

      const availableProducts = products.filter(
        (product) => Number(product.stock || 0) > 0
      );

      const lowStockProducts = products.filter((product) => {
        const stock = Number(product.stock || 0);
        return stock > 0 && stock <= 5;
      });

      const outOfStockProducts = products.filter(
        (product) => Number(product.stock || 0) <= 0
      );

      if (!availableProducts.length) {
        return res.json({
          generatedAt: new Date(),

          stockSummary: {
            totalProducts: products.length,
            availableProducts: 0,
            lowStockProducts: 0,
            outOfStockProducts:
              outOfStockProducts.length,
          },

          availableIngredients: [],

          lowStockIngredients: [],

          unavailableIngredients:
            outOfStockProducts.map((product) => ({
              _id: product._id,
              name: product.name,
              category: product.category,
              stock: Number(product.stock || 0),
            })),

          suggestions: [],

          aiMessage:
            "Aucun ingrédient disponible. Le stock doit être réapprovisionné avant de proposer un menu du jour.",
        });
      }

      const stockText = availableProducts
        .map(
          (product) =>
            `- ${product.name} | catégorie: ${
              product.category || "Non précisée"
            } | stock: ${Number(product.stock || 0)}`
        )
        .join("\n");

      const lowStockText = lowStockProducts.length
        ? lowStockProducts
            .map(
              (product) =>
                `- ${product.name}: ${Number(
                  product.stock || 0
                )}`
            )
            .join("\n")
        : "Aucun";

      const unavailableText = outOfStockProducts.length
        ? outOfStockProducts
            .map((product) => `- ${product.name}`)
            .join("\n")
        : "Aucun";

      let suggestions = [];
      let aiMessage = "";

      if (process.env.OPENROUTER_API_KEY) {
        try {
          const prompt = `
Tu es un assistant professionnel de gestion de restaurant.

Tu dois proposer un menu du jour à partir du stock actuellement disponible.

INGRÉDIENTS / PRODUITS DISPONIBLES :

${stockText}

PRODUITS EN STOCK FAIBLE :

${lowStockText}

PRODUITS INDISPONIBLES :

${unavailableText}

Règles obligatoires :

1. Propose exactement 3 plats maximum.
2. Utilise uniquement les produits indiqués comme disponibles.
3. Ne propose jamais un produit indiqué comme indisponible.
4. Évite autant que possible les produits en stock faible.
5. Ne suppose pas qu'un ingrédient existe s'il n'apparaît pas dans la liste.
6. Les propositions doivent être réalistes pour un restaurant.
7. Donne une courte raison expliquant pourquoi chaque plat est intéressant aujourd'hui.
8. Donne une priorité : "Haute", "Moyenne" ou "Basse".
9. Réponds uniquement en JSON valide.
10. N'ajoute aucun texte avant ou après le JSON.

Format obligatoire :

{
  "suggestions": [
    {
      "name": "Nom du plat",
      "ingredients": [
        "Ingrédient 1",
        "Ingrédient 2"
      ],
      "reason": "Explication courte",
      "priority": "Haute"
    }
  ],
  "analysis": "Analyse courte du stock et conseil pour le responsable."
}
`;

          const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              model: "openai/gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
              temperature: 0.4,
              response_format: {
                type: "json_object",
              },
            },
            {
              headers: {
                Authorization:
                  `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );

          let content =
            response.data?.choices?.[0]?.message?.content?.trim();

          if (content) {
            content = content
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/\s*```$/i, "")
              .trim();

            const parsed = JSON.parse(content);

            if (Array.isArray(parsed.suggestions)) {
              suggestions = parsed.suggestions
                .slice(0, 3)
                .map((suggestion) => ({
                  name:
                    suggestion.name ||
                    "Suggestion",

                  ingredients: Array.isArray(
                    suggestion.ingredients
                  )
                    ? suggestion.ingredients
                    : [],

                  reason:
                    suggestion.reason || "",

                  priority: [
                    "Haute",
                    "Moyenne",
                    "Basse",
                  ].includes(suggestion.priority)
                    ? suggestion.priority
                    : "Moyenne",
                }));
            }

            aiMessage =
              parsed.analysis || "";
          }
        } catch (aiError) {
          console.error(
            "DAILY MENU AI ERROR:",
            aiError.response?.data ||
              aiError.message
          );
        }
      }

      if (!aiMessage) {
        aiMessage =
          `${availableProducts.length} produit(s) sont actuellement disponibles. ` +
          `${lowStockProducts.length} produit(s) sont en stock faible et ` +
          `${outOfStockProducts.length} produit(s) sont en rupture.`;
      }

      res.json({
        generatedAt: new Date(),

        stockSummary: {
          totalProducts: products.length,

          availableProducts:
            availableProducts.length,

          lowStockProducts:
            lowStockProducts.length,

          outOfStockProducts:
            outOfStockProducts.length,
        },

        availableIngredients: availableProducts.map(
          (product) => ({
            _id: product._id,
            name: product.name,
            category: product.category,
            stock: Number(product.stock || 0),
          })
        ),

        lowStockIngredients: lowStockProducts.map(
          (product) => ({
            _id: product._id,
            name: product.name,
            category: product.category,
            stock: Number(product.stock || 0),
          })
        ),

        unavailableIngredients: outOfStockProducts.map(
          (product) => ({
            _id: product._id,
            name: product.name,
            category: product.category,
            stock: Number(product.stock || 0),
          })
        ),

        suggestions,

        aiMessage,
      });
    } catch (error) {
      console.error(
        "DAILY MENU ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Impossible de générer le menu du jour.",

        error: error.message,
      });
    }
  }
);

// ======================================================
// PRODUCTS
// ======================================================

// GET PRODUCTS

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message:
        "Erreur lors du chargement des produits",

      error: error.message,
    });
  }
});

// CREATE PRODUCT

app.post("/api/products", async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      stock,
      ingredients,
      description,
    } = req.body;

    if (
      !name?.trim() ||
      !category?.trim()
    ) {
      return res.status(400).json({
        message:
          "Le nom et la catégorie sont obligatoires",
      });
    }

    const parsedPrice =
      Number(price);

    const parsedStock =
      Number(stock);

    if (
      !Number.isFinite(
        parsedPrice
      ) ||
      parsedPrice < 0
    ) {
      return res.status(400).json({
        message: "Prix invalide",
      });
    }

    if (
      !Number.isInteger(
        parsedStock
      ) ||
      parsedStock < 0
    ) {
      return res.status(400).json({
        message: "Stock invalide",
      });
    }

    const product =
      await Product.create({
        name:
          name.trim(),

        category:
          category.trim(),

        price:
          parsedPrice,

        stock:
          parsedStock,

        ingredients:
          ingredients?.trim() ||
          "",

        description:
          description?.trim() ||
          "",
      });

    res.status(201).json(
      product
    );
  } catch (error) {
    res.status(400).json({
      message:
        "Impossible d'ajouter le produit",

      error:
        error.message,
    });
  }
});

// UPDATE PRODUCT

app.put(
  "/api/products/:id",
  async (req, res) => {
    try {
      const {
        name,
        category,
        price,
        stock,
        ingredients,
        description,
      } = req.body;

      const product =
        await Product.findByIdAndUpdate(
          req.params.id,
          {
            name:
              name?.trim(),

            category:
              category?.trim(),

            price:
              Number(price),

            stock:
              Number(stock),

            ingredients:
              ingredients?.trim() ||
              "",

            description:
              description?.trim() ||
              "",
          },
          {
            new: true,
            runValidators:
              true,
          }
        );

      if (!product) {
        return res.status(404).json({
          message:
            "Produit introuvable",
        });
      }

      res.json(product);
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de modifier le produit",

        error:
          error.message,
      });
    }
  }
);

// RESTOCK PRODUCT

app.put(
  "/api/products/:id/restock",
  async (req, res) => {
    try {
      const quantity =
        Number(
          req.body.quantity
        );

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message:
            "Quantité invalide",
        });
      }

      const product =
        await Product.findById(
          req.params.id
        );

      if (!product) {
        return res.status(404).json({
          message:
            "Produit introuvable",
        });
      }

      const stockBefore =
        Number(
          product.stock || 0
        );

      product.stock =
        stockBefore +
        quantity;

      await product.save();

      await StockMovement.create({
        product:
          product._id,

        productName:
          product.name,

        type:
          "Réapprovisionnement",

        quantity,

        stockBefore,

        stockAfter:
          product.stock,
      });

      res.json(product);
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de réapprovisionner le produit",

        error:
          error.message,
      });
    }
  }
);

// DELETE PRODUCT

app.delete(
  "/api/products/:id",
  async (req, res) => {
    try {
      const linkedDetails =
        await OrderDetail.countDocuments({
          product:
            req.params.id,
        });

      if (linkedDetails > 0) {
        return res.status(400).json({
          message:
            `Impossible de supprimer ce produit : il est utilisé dans ${linkedDetails} détail(s) de commande.`,
        });
      }

      const product =
        await Product.findByIdAndDelete(
          req.params.id
        );

      if (!product) {
        return res.status(404).json({
          message:
            "Produit introuvable",
        });
      }

      res.json({
        message:
          "Produit supprimé avec succès",
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Impossible de supprimer le produit",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// CUSTOMERS
// ======================================================

app.get(
  "/api/customers",
  async (req, res) => {
    try {
      const customers =
        await Customer.find().sort({
          createdAt: -1,
        });

      const orders =
        await Order.find();

      const customersWithStats =
        customers.map(
          (customer) => {
            const customerOrders =
              orders.filter(
                (order) => {
                  if (
                    order.customer
                  ) {
                    return (
                      order.customer.toString() ===
                      customer._id.toString()
                    );
                  }

                  return (
                    order.customerName
                      ?.trim()
                      .toLowerCase() ===
                    customer.name
                      .trim()
                      .toLowerCase()
                  );
                }
              );

            const completedOrders =
              customerOrders.filter(
                (order) =>
                  order.status ===
                  "Terminée"
              );

            const totalSpent =
              completedOrders.reduce(
                (
                  sum,
                  order
                ) =>
                  sum +
                  Number(
                    order.total || 0
                  ),
                0
              );

            const sortedOrders =
              [
                ...customerOrders,
              ].sort(
                (a, b) =>
                  new Date(
                    b.createdAt
                  ) -
                  new Date(
                    a.createdAt
                  )
              );

            return {
              ...customer.toObject(),

              totalOrders:
                customerOrders.length,

              completedOrders:
                completedOrders.length,

              totalSpent,

              lastOrderDate:
                sortedOrders[0]
                  ?.createdAt ||
                null,
            };
          }
        );

      res.json(
        customersWithStats
      );
    } catch (error) {
      res.status(500).json({
        message:
          "Erreur lors du chargement des clients",

        error:
          error.message,
      });
    }
  }
);

// CREATE CUSTOMER

app.post(
  "/api/customers",
  async (req, res) => {
    try {
      const {
        name,
        phone,
        email,
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          message:
            "Le nom du client est obligatoire",
        });
      }

      const safeName =
        escapeRegex(
          name.trim()
        );

      const existing =
        await Customer.findOne({
          name: {
            $regex:
              new RegExp(
                `^${safeName}$`,
                "i"
              ),
          },
        });

      if (existing) {
        return res.status(400).json({
          message:
            "Ce client existe déjà",
        });
      }

      const customer =
        await Customer.create({
          name:
            name.trim(),

          phone:
            phone?.trim() ||
            "",

          email:
            email?.trim() ||
            "",
        });

      res.status(201).json(
        customer
      );
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible d'ajouter le client",

        error:
          error.message,
      });
    }
  }
);

// UPDATE CUSTOMER

app.put(
  "/api/customers/:id",
  async (req, res) => {
    try {
      const {
        name,
        phone,
        email,
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          message:
            "Le nom du client est obligatoire",
        });
      }

      const customer =
        await Customer.findByIdAndUpdate(
          req.params.id,
          {
            name:
              name.trim(),

            phone:
              phone?.trim() ||
              "",

            email:
              email?.trim() ||
              "",
          },
          {
            new: true,
            runValidators:
              true,
          }
        );

      if (!customer) {
        return res.status(404).json({
          message:
            "Client introuvable",
        });
      }

      res.json(customer);
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de modifier le client",

        error:
          error.message,
      });
    }
  }
);

// DELETE CUSTOMER

app.delete(
  "/api/customers/:id",
  async (req, res) => {
    try {
      const linkedOrders =
        await Order.countDocuments({
          customer:
            req.params.id,
        });

      const linkedReservations =
        await Reservation.countDocuments({
          customer:
            req.params.id,
        });

      if (
        linkedOrders > 0 ||
        linkedReservations > 0
      ) {
        return res.status(400).json({
          message:
            `Impossible de supprimer ce client : ${linkedOrders} commande(s) et ${linkedReservations} réservation(s) sont liées.`,
        });
      }

      const customer =
        await Customer.findByIdAndDelete(
          req.params.id
        );

      if (!customer) {
        return res.status(404).json({
          message:
            "Client introuvable",
        });
      }

      res.json({
        message:
          "Client supprimé avec succès",
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Impossible de supprimer le client",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// CUSTOMER ORDER MIGRATION
// ======================================================

app.post(
  "/api/customers/migrate-orders",
  requireAdmin,
  async (req, res) => {
    try {
      const orders =
        await Order.find();

      let migratedOrders = 0;
      let createdCustomers = 0;

      for (const order of orders) {
        if (order.customer) {
          continue;
        }

        if (!order.customerName?.trim()) {
          continue;
        }

        const customerName =
          order.customerName.trim();

        const safeName =
          escapeRegex(
            customerName
          );

        let customer =
          await Customer.findOne({
            name: {
              $regex:
                new RegExp(
                  `^${safeName}$`,
                  "i"
                ),
            },
          });

        if (!customer) {
          customer =
            await Customer.create({
              name:
                customerName,
            });

          createdCustomers++;
        }

        order.customer =
          customer._id;

        await order.save();

        migratedOrders++;
      }

      res.json({
        message:
          "Migration terminée",

        migratedOrders,

        createdCustomers,
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Erreur pendant la migration",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// RESERVATIONS
// ======================================================

app.get(
  "/api/reservations",
  async (req, res) => {
    try {
      const reservations =
        await Reservation.find()
          .populate(
            "customer",
            "name phone email"
          )
          .sort({
            date: 1,
            time: 1,
          });

      res.json(reservations);
    } catch (error) {
      res.status(500).json({
        message:
          "Erreur lors du chargement des réservations",

        error:
          error.message,
      });
    }
  }
);

// CREATE RESERVATION

app.post(
  "/api/reservations",
  async (req, res) => {
    try {
      const {
        customerId,
        customerName,
        phone,
        date,
        time,
        guests,
        tableNumber,
        status,
        notes,
      } = req.body;

      if (
        !customerName?.trim() ||
        !date ||
        !time ||
        !guests
      ) {
        return res.status(400).json({
          message:
            "Client, date, heure et nombre de personnes sont obligatoires",
        });
      }

      let customer = null;

      if (
        customerId &&
        mongoose.Types.ObjectId.isValid(
          customerId
        )
      ) {
        customer =
          await Customer.findById(
            customerId
          );
      }

      if (!customer) {
        const safeName =
          escapeRegex(
            customerName.trim()
          );

        customer =
          await Customer.findOne({
            name: {
              $regex:
                new RegExp(
                  `^${safeName}$`,
                  "i"
                ),
            },
          });
      }

      if (!customer) {
        customer =
          await Customer.create({
            name:
              customerName.trim(),

            phone:
              phone?.trim() ||
              "",
          });
      }

      const guestCount =
        Number(guests);

      if (
        !Number.isInteger(
          guestCount
        ) ||
        guestCount < 1
      ) {
        return res.status(400).json({
          message:
            "Nombre de personnes invalide",
        });
      }

      const reservationDate =
        new Date(date);

      if (
        Number.isNaN(
          reservationDate.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "Date invalide",
        });
      }

      reservationDate.setHours(
        0,
        0,
        0,
        0
      );

      const parsedTable =
        tableNumber === "" ||
        tableNumber === null ||
        tableNumber === undefined
          ? null
          : Number(
              tableNumber
            );

      const finalStatus =
        [
          "En attente",
          "Confirmée",
          "Installée",
          "Terminée",
          "Annulée",
        ].includes(status)
          ? status
          : "En attente";

      const reservation =
        await Reservation.create({
          customer:
            customer._id,

          customerName:
            customer.name,

          phone:
            phone?.trim() ||
            customer.phone ||
            "",

          date:
            reservationDate,

          time,

          guests:
            guestCount,

          tableNumber:
            parsedTable,

          status:
            finalStatus,

          notes:
            notes?.trim() ||
            "",
        });

      const result =
        await Reservation.findById(
          reservation._id
        ).populate(
          "customer",
          "name phone email"
        );

      res.status(201).json(
        result
      );
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de créer la réservation",

        error:
          error.message,
      });
    }
  }
);

// UPDATE RESERVATION

app.put(
  "/api/reservations/:id",
  async (req, res) => {
    try {
      const reservation =
        await Reservation.findById(
          req.params.id
        );

      if (!reservation) {
        return res.status(404).json({
          message:
            "Réservation introuvable",
        });
      }

      Object.assign(
        reservation,
        req.body
      );

      await reservation.save();

      res.json(reservation);
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de modifier la réservation",

        error:
          error.message,
      });
    }
  }
);

// UPDATE RESERVATION STATUS

app.put(
  "/api/reservations/:id/status",
  async (req, res) => {
    try {
      const status =
        req.body.status;

      const allowed = [
        "En attente",
        "Confirmée",
        "Installée",
        "Terminée",
        "Annulée",
      ];

      if (!allowed.includes(status)) {
        return res.status(400).json({
          message:
            "Statut invalide",
        });
      }

      const reservation =
        await Reservation.findByIdAndUpdate(
          req.params.id,
          {
            status,
          },
          {
            new: true,
          }
        ).populate(
          "customer",
          "name phone email"
        );

      if (!reservation) {
        return res.status(404).json({
          message:
            "Réservation introuvable",
        });
      }

      res.json(reservation);
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de modifier la réservation",

        error:
          error.message,
      });
    }
  }
);

// DELETE RESERVATION

app.delete(
  "/api/reservations/:id",
  async (req, res) => {
    try {
      const reservation =
        await Reservation.findByIdAndDelete(
          req.params.id
        );

      if (!reservation) {
        return res.status(404).json({
          message:
            "Réservation introuvable",
        });
      }

      res.json({
        message:
          "Réservation supprimée avec succès",
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Impossible de supprimer la réservation",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// STOCK MOVEMENTS
// ======================================================

app.get(
  "/api/stock-movements",
  async (req, res) => {
    try {
      const movements =
        await StockMovement.find()
          .sort({
            createdAt: -1,
          })
          .limit(200);

      res.json(movements);
    } catch (error) {
      res.status(500).json({
        message:
          "Impossible de charger l'historique du stock",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// ORDERS
// ======================================================

app.get(
  "/api/orders",
  async (req, res) => {
    try {
      const orders =
        await Order.find()
          .populate(
            "customer",
            "name phone email"
          )
          .sort({
            createdAt: -1,
          });

      res.json(orders);
    } catch (error) {
      res.status(500).json({
        message:
          "Erreur lors du chargement des commandes",

        error:
          error.message,
      });
    }
  }
);

// CREATE ORDER

app.post(
  "/api/orders",
  async (req, res) => {
    try {
      const {
        customerName,
        customerId,
        items,
        paymentMethod,
      } = req.body;

      if (
        !customerName?.trim() ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          message:
            "Le client et les articles sont obligatoires",
        });
      }

      let customer = null;

      if (
        customerId &&
        mongoose.Types.ObjectId.isValid(
          customerId
        )
      ) {
        customer =
          await Customer.findById(
            customerId
          );
      }

      if (!customer) {
        const safeName =
          escapeRegex(
            customerName.trim()
          );

        customer =
          await Customer.findOne({
            name: {
              $regex:
                new RegExp(
                  `^${safeName}$`,
                  "i"
                ),
            },
          });
      }

      if (!customer) {
        customer =
          await Customer.create({
            name:
              customerName.trim(),
          });
      }

      let total = 0;

      const orderItems = [];

      for (const item of items) {
        const product =
          await Product.findById(
            item.product
          );

        if (!product) {
          return res.status(404).json({
            message:
              "Produit introuvable",
          });
        }

        const quantity =
          Number(
            item.quantity
          );

        if (
          !Number.isInteger(
            quantity
          ) ||
          quantity < 1
        ) {
          return res.status(400).json({
            message:
              `Quantité invalide pour ${product.name}`,
          });
        }

        if (
          Number(
            product.stock
          ) < quantity
        ) {
          return res.status(400).json({
            message:
              `Stock insuffisant pour ${product.name}`,
          });
        }

        orderItems.push({
          product:
            product._id,

          name:
            product.name,

          price:
            Number(
              product.price
            ),

          quantity,
        });

        total +=
          Number(
            product.price
          ) *
          quantity;
      }

      const order =
        await Order.create({
          orderNumber:
            "CMD-" +
            Date.now()
              .toString()
              .slice(-8),

          customer:
            customer._id,

          customerName:
            customer.name,

          items:
            orderItems,

          total,

          paymentMethod:
            paymentMethod ||
            "Espèces",

          status:
            "En attente",
        });

      await OrderDetail.insertMany(
        orderItems.map(
          (item) => ({
            order:
              order._id,

            product:
              item.product,

            productName:
              item.name,

            quantity:
              item.quantity,

            unitPrice:
              item.price,

            subtotal:
              item.price *
              item.quantity,
          })
        )
      );

      for (const item of orderItems) {
        const product =
          await Product.findById(
            item.product
          );

        const stockBefore =
          product.stock;

        product.stock -=
          item.quantity;

        await product.save();

        await StockMovement.create({
          product:
            product._id,

          productName:
            product.name,

          type:
            "Commande",

          quantity:
            -item.quantity,

          stockBefore,

          stockAfter:
            product.stock,

          order:
            order._id,

          orderNumber:
            order.orderNumber,
        });
      }

      const result =
        await Order.findById(
          order._id
        ).populate(
          "customer",
          "name phone email"
        );

      res.status(201).json(
        result
      );
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de créer la commande",

        error:
          error.message,
      });
    }
  }
);

// UPDATE ORDER STATUS

app.put(
  "/api/orders/:id/status",
  async (req, res) => {
    try {
      const status =
        req.body.status;

      const allowed = [
        "En attente",
        "En préparation",
        "Prête",
        "Terminée",
        "Annulée",
      ];

      if (!allowed.includes(status)) {
        return res.status(400).json({
          message:
            "Statut invalide",
        });
      }

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Commande introuvable",
        });
      }

      const previousStatus =
        order.status;

      // ----------------------------------------------
      // CANCEL ORDER -> RESTORE STOCK
      // ----------------------------------------------

      if (
        status === "Annulée" &&
        previousStatus !== "Annulée"
      ) {
        for (
          const item of order.items
        ) {
          const product =
            await Product.findById(
              item.product
            );

          if (!product) {
            continue;
          }

          const stockBefore =
            product.stock;

          product.stock +=
            item.quantity;

          await product.save();

          await StockMovement.create({
            product:
              product._id,

            productName:
              product.name,

            type:
              "Annulation",

            quantity:
              item.quantity,

            stockBefore,

            stockAfter:
              product.stock,

            order:
              order._id,

            orderNumber:
              order.orderNumber,
          });
        }
      }

      // ----------------------------------------------
      // REACTIVATE CANCELLED ORDER
      // ----------------------------------------------

      if (
        previousStatus === "Annulée" &&
        status !== "Annulée"
      ) {
        for (
          const item of order.items
        ) {
          const product =
            await Product.findById(
              item.product
            );

          if (
            !product ||
            product.stock <
              item.quantity
          ) {
            return res.status(400).json({
              message:
                `Stock insuffisant pour ${item.name}`,
            });
          }
        }

        for (
          const item of order.items
        ) {
          const product =
            await Product.findById(
              item.product
            );

          const stockBefore =
            product.stock;

          product.stock -=
            item.quantity;

          await product.save();

          await StockMovement.create({
            product:
              product._id,

            productName:
              product.name,

            type:
              "Réactivation",

            quantity:
              -item.quantity,

            stockBefore,

            stockAfter:
              product.stock,

            order:
              order._id,

            orderNumber:
              order.orderNumber,
          });
        }
      }

      order.status = status;

      await order.save();

      const result =
        await Order.findById(
          order._id
        ).populate(
          "customer",
          "name phone email"
        );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        message:
          "Impossible de modifier la commande",

        error:
          error.message,
      });
    }
  }
);

// DELETE ORDER

app.delete(
  "/api/orders/:id",
  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Commande introuvable",
        });
      }

      if (
        order.status !== "Annulée"
      ) {
        for (
          const item of order.items
        ) {
          const product =
            await Product.findById(
              item.product
            );

          if (!product) {
            continue;
          }

          const stockBefore =
            product.stock;

          product.stock +=
            item.quantity;

          await product.save();

          await StockMovement.create({
            product:
              product._id,

            productName:
              product.name,

            type:
              "Suppression commande",

            quantity:
              item.quantity,

            stockBefore,

            stockAfter:
              product.stock,

            order:
              order._id,

            orderNumber:
              order.orderNumber,
          });
        }
      }

      await OrderDetail.deleteMany({
        order:
          order._id,
      });

      await Order.findByIdAndDelete(
        order._id
      );

      res.json({
        message:
          "Commande supprimée avec succès",
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Impossible de supprimer la commande",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// ORDER DETAILS
// ======================================================

app.get(
  "/api/order-details",
  async (req, res) => {
    try {
      const details =
        await OrderDetail.find()
          .populate(
            "product",
            "name category price stock ingredients description"
          )
          .populate(
            "order"
          )
          .sort({
            createdAt: -1,
          });

      res.json(details);
    } catch (error) {
      res.status(500).json({
        message:
          "Impossible de charger les détails",

        error:
          error.message,
      });
    }
  }
);

app.get(
  "/api/orders/:id/details",
  async (req, res) => {
    try {
      const details =
        await OrderDetail.find({
          order:
            req.params.id,
        }).populate(
          "product",
          "name category price stock ingredients description"
        );

      res.json(details);
    } catch (error) {
      res.status(500).json({
        message:
          "Impossible de charger les détails",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// ORDER DETAIL MIGRATION
// ======================================================

app.post(
  "/api/order-details/migrate",
  requireAdmin,
  async (req, res) => {
    try {
      const orders =
        await Order.find();

      let migratedOrders = 0;
      let createdDetails = 0;
      let skippedOrders = 0;

      for (const order of orders) {
        const existing =
          await OrderDetail.countDocuments({
            order:
              order._id,
          });

        if (
          existing > 0 ||
          !order.items?.length
        ) {
          skippedOrders++;
          continue;
        }

        const details =
          order.items.map(
            (item) => ({
              order:
                order._id,

              product:
                item.product,

              productName:
                item.name,

              quantity:
                item.quantity,

              unitPrice:
                item.price,

              subtotal:
                item.price *
                item.quantity,
            })
          );

        await OrderDetail.insertMany(
          details
        );

        migratedOrders++;

        createdDetails +=
          details.length;
      }

      res.json({
        message:
          "Migration vers order_details terminée",

        migratedOrders,

        createdDetails,

        skippedOrders,
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Erreur pendant la migration",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// DASHBOARD
// ======================================================

app.get(
  "/api/dashboard",
  async (req, res) => {
    try {
      const products =
        await Product.find();

      const orders =
        await Order.find()
          .populate(
            "customer",
            "name"
          )
          .sort({
            createdAt: -1,
          });

      const reservations =
        await Reservation.find();

      const completedOrders =
        orders.filter(
          (order) =>
            order.status ===
            "Terminée"
        );

      const totalSales =
        completedOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.total || 0
            ),
          0
        );

      const activeOrders =
        orders.filter(
          (order) =>
            [
              "En attente",
              "En préparation",
              "Prête",
            ].includes(
              order.status
            )
        ).length;

      const cancelledOrders =
        orders.filter(
          (order) =>
            order.status ===
            "Annulée"
        ).length;

      const lowStock =
        products.filter(
          (product) =>
            Number(
              product.stock
            ) <= 5
        ).length;

      // ----------------------------------------------
      // BEST SELLING PRODUCTS
      // ----------------------------------------------

      const salesMap = {};

      completedOrders.forEach(
        (order) => {
          order.items.forEach(
            (item) => {
              if (
                !salesMap[
                  item.name
                ]
              ) {
                salesMap[
                  item.name
                ] = {
                  name:
                    item.name,

                  quantity: 0,

                  revenue: 0,
                };
              }

              salesMap[
                item.name
              ].quantity +=
                item.quantity;

              salesMap[
                item.name
              ].revenue +=
                item.price *
                item.quantity;
            }
          );
        }
      );

      const bestSelling =
        Object.values(
          salesMap
        )
          .sort(
            (a, b) =>
              b.quantity -
              a.quantity
          )
          .slice(0, 5);

      const totalCustomers =
        await Customer.countDocuments();

      // ----------------------------------------------
      // TODAY
      // ----------------------------------------------

      const now =
        new Date();

      const startToday =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

      const endToday =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );

      const todayOrders =
        orders.filter(
          (order) =>
            new Date(
              order.createdAt
            ) >= startToday &&
            new Date(
              order.createdAt
            ) < endToday
        );

      const todayCompleted =
        todayOrders.filter(
          (order) =>
            order.status ===
            "Terminée"
        );

      const todaySales =
        todayCompleted.reduce(
          (sum, order) =>
            sum +
            Number(
              order.total || 0
            ),
          0
        );

      // ----------------------------------------------
      // LAST 7 DAYS
      // ----------------------------------------------

      const salesLast7Days = [];

      for (
        let i = 6;
        i >= 0;
        i--
      ) {
        const day =
          new Date();

        day.setHours(
          0,
          0,
          0,
          0
        );

        day.setDate(
          day.getDate() - i
        );

        const end =
          new Date(day);

        end.setDate(
          end.getDate() + 1
        );

        const dailyOrders =
          completedOrders.filter(
            (order) =>
              new Date(
                order.createdAt
              ) >= day &&
              new Date(
                order.createdAt
              ) < end
          );

        salesLast7Days.push({
          date:
            day.toLocaleDateString(
              "fr-FR",
              {
                weekday:
                  "short",
              }
            ),

          fullDate:
            day.toLocaleDateString(
              "fr-FR"
            ),

          sales:
            dailyOrders.reduce(
              (sum, order) =>
                sum +
                Number(
                  order.total ||
                    0
                ),
              0
            ),

          orders:
            dailyOrders.length,
        });
      }

      const last7DaysSales =
        salesLast7Days.reduce(
          (sum, day) =>
            sum +
            day.sales,
          0
        );

      const last7DaysOrders =
        salesLast7Days.reduce(
          (sum, day) =>
            sum +
            day.orders,
          0
        );

      const averageOrderValue =
        completedOrders.length
          ? totalSales /
            completedOrders.length
          : 0;

      // ----------------------------------------------
      // RESPONSE
      // ----------------------------------------------

      res.json({
        totalSales,

        todaySales,

        totalOrders:
          orders.length,

        todayOrders:
          todayOrders.length,

        activeOrders,

        completedOrders:
          completedOrders.length,

        cancelledOrders,

        totalProducts:
          products.length,

        lowStock,

        totalCustomers,

        averageOrderValue,

        last7DaysSales,

        last7DaysOrders,

        totalReservations:
          reservations.length,

        recentOrders:
          orders.slice(0, 5),

        bestSelling,

        salesLast7Days,
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Erreur lors du chargement du tableau de bord",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// REPORTS
// ======================================================

app.get(
  "/api/reports",
  async (req, res) => {
    try {
      const {
        from,
        to,
      } = req.query;

      const filter = {};

      if (from || to) {
        filter.createdAt = {};

        if (from) {
          const start =
            new Date(from);

          start.setHours(
            0,
            0,
            0,
            0
          );

          filter.createdAt.$gte =
            start;
        }

        if (to) {
          const end =
            new Date(to);

          end.setHours(
            23,
            59,
            59,
            999
          );

          filter.createdAt.$lte =
            end;
        }
      }

      const orders =
        await Order.find(
          filter
        ).populate(
          "customer",
          "name phone email"
        );

      const products =
        await Product.find();

      const completed =
        orders.filter(
          (order) =>
            order.status ===
            "Terminée"
        );

      const cancelled =
        orders.filter(
          (order) =>
            order.status ===
            "Annulée"
        );

      const active =
        orders.filter(
          (order) =>
            [
              "En attente",
              "En préparation",
              "Prête",
            ].includes(
              order.status
            )
        );

      const totalRevenue =
        completed.reduce(
          (sum, order) =>
            sum +
            Number(
              order.total || 0
            ),
          0
        );

      const dishMap = {};
      const paymentMap = {};
      const customerMap = {};
      const dailyMap = {};

      completed.forEach(
        (order) => {
          // ------------------------------------------
          // PAYMENT
          // ------------------------------------------

          const payment =
            order.paymentMethod ||
            "Non défini";

          if (
            !paymentMap[payment]
          ) {
            paymentMap[
              payment
            ] = {
              name:
                payment,

              orders: 0,

              revenue: 0,
            };
          }

          paymentMap[
            payment
          ].orders++;

          paymentMap[
            payment
          ].revenue +=
            Number(
              order.total || 0
            );

          // ------------------------------------------
          // DISHES
          // ------------------------------------------

          order.items.forEach(
            (item) => {
              const key =
                item.name;

              if (
                !dishMap[key]
              ) {
                dishMap[
                  key
                ] = {
                  name:
                    item.name,

                  quantity: 0,

                  revenue: 0,
                };
              }

              dishMap[
                key
              ].quantity +=
                item.quantity;

              dishMap[
                key
              ].revenue +=
                item.price *
                item.quantity;
            }
          );

          // ------------------------------------------
          // CUSTOMER
          // ------------------------------------------

          const customerName =
            order.customer
              ?.name ||
            order.customerName ||
            "Client inconnu";

          if (
            !customerMap[
              customerName
            ]
          ) {
            customerMap[
              customerName
            ] = {
              name:
                customerName,

              orders: 0,

              spent: 0,
            };
          }

          customerMap[
            customerName
          ].orders++;

          customerMap[
            customerName
          ].spent +=
            Number(
              order.total || 0
            );

          // ------------------------------------------
          // DAILY SALES
          // ------------------------------------------

          const date =
            new Date(
              order.createdAt
            );

          const key =
            date
              .toISOString()
              .slice(0, 10);

          if (
            !dailyMap[key]
          ) {
            dailyMap[
              key
            ] = {
              isoDate:
                key,

              date:
                date.toLocaleDateString(
                  "fr-FR"
                ),

              revenue: 0,

              orders: 0,
            };
          }

          dailyMap[
            key
          ].revenue +=
            Number(
              order.total || 0
            );

          dailyMap[
            key
          ].orders++;
        }
      );

      const lowStockProducts =
        products.filter(
          (product) =>
            Number(
              product.stock
            ) <= 5
        );

      res.json({
        period: {
          from:
            from || null,

          to:
            to || null,
        },

        summary: {
          totalOrders:
            orders.length,

          completedOrders:
            completed.length,

          activeOrders:
            active.length,

          cancelledOrders:
            cancelled.length,

          totalRevenue,

          averageOrderValue:
            completed.length
              ? totalRevenue /
                completed.length
              : 0,
        },

        paymentBreakdown:
          Object.values(
            paymentMap
          ),

        topDishes:
          Object.values(
            dishMap
          )
            .sort(
              (a, b) =>
                b.quantity -
                a.quantity
            )
            .slice(0, 10),

        topCustomers:
          Object.values(
            customerMap
          )
            .sort(
              (a, b) =>
                b.spent -
                a.spent
            )
            .slice(0, 10),

        dailySales:
          Object.values(
            dailyMap
          ).sort(
            (a, b) =>
              new Date(
                a.isoDate
              ) -
              new Date(
                b.isoDate
              )
          ),

        statusBreakdown: [
          {
            name:
              "En cours",

            value:
              active.length,
          },

          {
            name:
              "Terminées",

            value:
              completed.length,
          },

          {
            name:
              "Annulées",

            value:
              cancelled.length,
          },
        ],

        stock: {
          totalProducts:
            products.length,

          lowStockCount:
            lowStockProducts.length,

          outOfStockCount:
            products.filter(
              (product) =>
                Number(
                  product.stock
                ) === 0
            ).length,

          lowStockProducts:
            lowStockProducts.slice(
              0,
              10
            ),
        },
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Erreur lors du chargement des rapports",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// 404 API
// ======================================================

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      message:
        "Route API introuvable",
    });
  }
);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Erreur interne du serveur",
    });
  }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );

    console.log(
      "🔐 API protection enabled"
    );

    console.log(
      "🧾 OrderDetail system enabled"
    );

    console.log(
      "🤖 AI recommendation system enabled"
    );

    console.log(
      "🍳 AI daily menu system enabled"
    );

    console.log(
      "📈 AI sales forecast system enabled"
    );

    console.log(
      process.env.OPENROUTER_API_KEY
        ? "✨ OpenRouter AI enabled"
        : "⚠ OpenRouter AI key missing"
    );
  }
);