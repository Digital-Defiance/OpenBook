import { Document } from 'mongoose';
import { Root } from 'remark-gfm';

export interface IFileIndex extends Document {
    table: string;
    file: string;
    hash: string;
    record: Root;
    indexingVersion: string;
    date: Date;
}