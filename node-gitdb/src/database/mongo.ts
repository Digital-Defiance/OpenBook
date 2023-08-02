import mongoose, { Model } from 'mongoose';

// Define an interface for the model collection to be used for type-checking
interface Models {
  [key: string]: Model<any>;
}

export async function getModels(): Promise<Models> {
    const models: Models = {};
    const fileIndexModule = await import(`${__dirname}/../models/fileIndex.js`);
    const indexTrackerModule = await import(`${__dirname}/../models/indexTracker.js`);
    models['FileIndex'] = fileIndexModule.default.default(mongoose);
    models['IndexTracker'] = indexTrackerModule.default.default(mongoose);
    return models;
  }
  