import { Schema } from 'mongoose';

export interface IFileNode {
    fileIndexId: Schema.Types.ObjectId;
    table: string;
    file: string;
    path: string;
    value?: string;
    date: Date;
}