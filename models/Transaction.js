const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserWallet",
      required: [true, "Wallet ID is required"],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true
    },
    title: {
      type: String,
      required: [true, "Transaction title is required"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"]
    },
    file: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow null/empty
          const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
          const fileExtension = v.toLowerCase().substring(v.lastIndexOf("."));
          return allowedExtensions.includes(fileExtension);
        },
        message: "File must be PDF, JPG, or PNG format"
      }
    },
    transactionDate: {
      type: Date,
      required: [true, "Transaction date is required"],
      default: Date.now
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"]
    },
    transactionType: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: {
        values: ["income", "expense"],
        message: "Transaction type must be income or expense"
      }
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
transactionSchema.index({ userId: 1, isDeleted: 1 });
transactionSchema.index({ walletId: 1 });
transactionSchema.index({ transactionDate: -1 });
transactionSchema.index({ transactionType: 1 });

// Set deletedAt when soft deleting
transactionSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Transaction", transactionSchema);
