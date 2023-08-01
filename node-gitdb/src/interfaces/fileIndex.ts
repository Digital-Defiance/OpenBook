import { Document } from 'mongoose';
import { Node } from 'unist';

export interface IFileIndex extends Document {
    table: string;
    file: string;
    hash: string;
    record: Node;
    indexingVersion: string;
    date: Date;
}