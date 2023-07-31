import { Root } from 'mdast';
import { FrozenProcessor } from 'unified';

export async function getRemark(): Promise<
  FrozenProcessor<Root, Root, Root, string>
> {
  const unified = await import('unified');
  const remarkParse = await import('remark-parse');
  const remarkStringify = await import('remark-stringify');
  const remarkGfm = await import('remark-gfm');
  const remarkUnified: FrozenProcessor<Root, Root, Root, string> = unified
    .unified()
    .use(remarkParse.default)
    .use(remarkStringify.default)
    .use(remarkGfm.default)
    .freeze();
  return remarkUnified;
}