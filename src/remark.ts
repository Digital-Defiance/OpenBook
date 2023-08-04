import { Root } from 'mdast';
import { FrozenProcessor } from 'unified';

/**
 * Modeled after https://github.com/remarkjs/remark/blob/main/packages/remark/index.js
 * @returns a remark processor that can be used to parse markdown
 */
export async function getRemarkFromMarkdown(): Promise<
  FrozenProcessor<Root, Root, Root, void>
> {
  const unified = await import('unified');
  const remarkParse = await import('remark-parse');
  const remarkGfm = await import('remark-gfm');
  const remarkUnified: FrozenProcessor<Root, Root, Root, void> = unified
    .unified()
    .use(remarkParse.default)
    .use(remarkGfm.default)
    .freeze();
  return remarkUnified;
}

/**
 * Modeled after https://github.com/remarkjs/remark/blob/main/packages/remark/index.js
 * @returns a remark processor that can be used to parse markdown
 */
export async function getRemarkToMarkdown(): Promise<
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

/**
 * Modeled after https://github.com/remarkjs/remark/blob/main/packages/remark/index.js
 * @returns a remark processor that can be used to parse markdown
 */
export async function getRemarkToHtml(): Promise<
  FrozenProcessor<Root, Root, Root, string>
> {
  const unified = await import('unified');
  const remarkParse = await import('remark-parse');
  const remarkHtml = await import('remark-html');
  const remarkGfm = await import('remark-gfm');
  const remarkUnified: FrozenProcessor<Root, Root, Root, string> = unified
    .unified()
    .use(remarkParse.default)
    .use(remarkHtml.default)
    .use(remarkGfm.default)
    .freeze();
  return remarkUnified;
}
