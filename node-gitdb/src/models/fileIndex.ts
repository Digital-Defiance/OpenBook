import { model, Model, Schema } from 'mongoose';
import { IFileIndex } from '../interfaces/fileIndex';

export const fileIndexSchema: Schema = new Schema({
  table: String,
  file: String,
  hash: String,
  record: Object,
  indexingVersion: String,
  date: Date,
});

// Export a function that accepts a mongoose instance and returns a model
export default (
  mongoose: typeof import('mongoose')
): Model<IFileIndex> => {
  return model<IFileIndex>('FileIndex', fileIndexSchema);
};
