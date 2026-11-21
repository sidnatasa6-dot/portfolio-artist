import mongoose from 'mongoose';

const paintingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Поле title є обов’язковим'],
      trim: true,
      minlength: [2, 'title: щонайменше 2 символи'],
      maxlength: [100, 'title: не більше 100 символів'],
    },
    style: {
      type: String,
      required: [true, 'Поле style є обов’язковим'],
      enum: {
        values: ['oil', 'watercolor', 'acrylic', 'digital', 'sketch'],
        message:
          'style: допустимі значення oil, watercolor, acrylic, digital, sketch',
      },
    },
    year: {
      type: Number,
      required: [true, 'Поле year є обов’язковим'],
      cast: 'year: значення має бути числом',
      min: [1400, 'year: не менше 1400'],
      max: [2100, 'year: не більше 2100'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
      },
    },
  }
);

export default mongoose.model('Painting', paintingSchema);
