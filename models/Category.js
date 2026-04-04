const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [50, "Category name cannot be more than 50 characters"]
    },
    type: {
      type: String,
      required: [true, "Category type is required"],
      enum: {
        values: ["income", "expense"],
        message: "Category type must be income or expense"
      },
      index: true
    },
    icon: {
      type: String,
      default: "category"
    },
    color: {
      type: String,
      default: "#FF0000"
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
categorySchema.index({ userId: 1, type: 1, isDeleted: 1 });

// Set deletedAt when soft deleting
categorySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Category", categorySchema);
