import { model, Model, Schema } from 'mongoose';
import { IIndexTracker } from '../interfaces/indexTracker';
import { IChangedFile } from '../interfaces/changedFile';

export const indexTrackerSchema: Schema = new Schema({
  changes: Array<IChangedFile>,
  gitHash: String,
  indexingVersion: String,
  date: Date,
});

indexTrackerSchema.index({ indexingVersion: 1 }, { unique: true });

// Export a function that accepts a mongoose instance and returns a model
export default (
  mongoose: typeof import('mongoose')
): Model<IIndexTracker> => {
  return model<IIndexTracker>('IndexTracker', indexTrackerSchema);
};
