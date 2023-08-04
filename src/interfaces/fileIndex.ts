import { Document } from 'mongoose';
import { Root } from 'remark-gfm';

export interface IFileIndex extends Document {
    data: boolean;
    file: string;
    gitHash: string;
    indexingVersion: string;
    record: Root;
    sha256: string;
    table: string;
    date: Date;
}