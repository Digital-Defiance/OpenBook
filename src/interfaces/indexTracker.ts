import { Document } from 'mongoose';
import { IChangedFile } from './changedFile';

export interface IIndexTracker extends Document {
    changes: IChangedFile[];
    gitHash: string;
    indexingVersion: string;
    date: Date;
}