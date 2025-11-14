const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserWallet",
      required: [true, "Wallet ID is required"]
    },
    name: {
      type: String,
      required: [true, "Expense name is required"],
      trim: true,
      maxlength: [100, "Expense name cannot be more than 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"]
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"]
    },
    isFixedExpense: {
      type: Boolean,
      default: true
    },
    cycleDate: {
      type: Number, // Day of month (1-31)
      required: function() {
        return this.isFixedExpense;
      },
      min: [1, "Cycle date must be between 1 and 31"],
      max: [31, "Cycle date must be between 1 and 31"]
    },
    cycleType: {
      type: String,
      required: function() {
        return this.isFixedExpense;
      },
      enum: {
        values: ["monthly", "quarterly", "yearly"],
        message: "Cycle type must be monthly, quarterly, or yearly"
      }
    },
    entryDate: {
      type: Date,
      required: function() {
        return !this.isFixedExpense;
      },
      default: function() {
        return !this.isFixedExpense ? Date.now() : undefined;
      }
    },
    relaxationDate: {
      type: Date, // Date at which to prompt again
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for better performance
expenseSchema.index({ userId: 1, isDeleted: 1 });
expenseSchema.index({ walletId: 1 });
expenseSchema.index({ cycleDate: 1, cycleType: 1 });
expenseSchema.index({ isFixedExpense: 1 });
expenseSchema.index({ entryDate: 1 });

// Virtual to get formatted title
expenseSchema.virtual("transactionTitle").get(function () {
  const date = new Date();
  const formattedDate = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return `Added Expense for ${this.name} on ${formattedDate}`;
});

// Set deletedAt when soft deleting
expenseSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Set relaxationDate when cycle is processed
expenseSchema.methods.updateRelaxationDate = function () {
  const now = new Date();
  let nextDate = new Date(now.getFullYear(), now.getMonth(), this.cycleDate);

  switch (this.cycleType) {
    case "monthly":
      if (nextDate <= now) {
        nextDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          this.cycleDate
        );
      }
      break;
    case "quarterly":
      const quarter = Math.floor(now.getMonth() / 3);
      nextDate = new Date(now.getFullYear(), quarter * 3, this.cycleDate);
      if (nextDate <= now) {
        nextDate = new Date(
          now.getFullYear(),
          (quarter + 1) * 3,
          this.cycleDate
        );
      }
      break;
    case "yearly":
      nextDate = new Date(now.getFullYear(), 0, this.cycleDate);
      if (nextDate <= now) {
        nextDate = new Date(now.getFullYear() + 1, 0, this.cycleDate);
      }
      break;
  }

  this.relaxationDate = nextDate;
  return this.save();
};

module.exports = mongoose.model("Expense", expenseSchema);
