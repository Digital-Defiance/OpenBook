import { MongoClient, Db, Collection } from 'mongodb';

export class MongoConnector {
  private client: MongoClient;
  private database: Db;

  constructor(private uri: string, private dbName: string) {}

  async connect(): Promise<void> {
    console.log("Creating Mongo client");
    this.client = new MongoClient(this.uri);
    console.log("Connecting to MongoDB");
    await this.client.connect();
    console.log("Connected to MongoDB");
    console.log("Setting database");
    this.database = this.client.db(this.dbName);
    console.log("Database set");
  }

  async disconnect(): Promise<void> {
    console.log("Closing MongoDB connection");
    await this.client.close();
  }

  async resetCollection(collectionName: string): Promise<void> {
    console.log(`Resetting the mongo collection: ${collectionName}`);
    await this.database.collection(collectionName).deleteMany({});
  }

//   async createIndex(collectionName: string, fieldOrSpec: string | any, options?: IndexOptions): Promise<string> {
//     return await this.database.collection(collectionName).createIndex(fieldOrSpec, options);
//   }

  getCollection(collectionName: string): Collection {
    return this.database.collection(collectionName);
  }
}