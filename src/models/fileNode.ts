import { model, Model, Schema } from 'mongoose';
import { IFileNode } from '../interfaces/fileNode';

export const fileNodeSchema: Schema = new Schema({
  fileIndexId: Schema.Types.ObjectId,
  table: String,
  file: String,
  path: String,
  value: { type: String, required: false },
  date: Date,
});

// Create a unique compound index on 'table', 'file', and 'indexingVersion'.
fileNodeSchema.index(
  { table: 1, file: 1, path: 1, indexingVersion: 1 },
  { unique: true }
);

// Export a function that accepts a mongoose instance and returns a model
export default (mongoose: typeof import('mongoose')): Model<IFileNode> => {
  return model<IFileNode>('FileNode', fileNodeSchema);
};
