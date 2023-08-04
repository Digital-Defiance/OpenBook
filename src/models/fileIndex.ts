import { model, Model, Schema } from 'mongoose';
import { IFileIndex } from '../interfaces/fileIndex';

export const fileIndexSchema: Schema = new Schema({
  table: String,
  file: String,
  gitHash: String,
  sha256: String,
  record: Object,
  indexingVersion: String,
  date: Date,
});

// Create a unique compound index on 'table', 'file', and 'indexingVersion'.
fileIndexSchema.index({ table: 1, file: 1, indexingVersion: 1 }, { unique: true });

// Export a function that accepts a mongoose instance and returns a model
export default (
  mongoose: typeof import('mongoose')
): Model<IFileIndex> => {
  return model<IFileIndex>('FileIndex', fileIndexSchema);
};
