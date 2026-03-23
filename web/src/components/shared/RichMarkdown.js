'use client';

import Markdown from 'markdown-to-jsx';
import BodyContentImage from '@/components/shared/BodyContentImage';

const DEFAULT_LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline break-words';
const DEFAULT_IMAGE_CLASS = 'rounded-xl shadow-md my-4';

export default function RichMarkdown({
  content,
  className = '',
  linkClassName = DEFAULT_LINK_CLASS,
  imageClassName = DEFAULT_IMAGE_CLASS,
}) {
  if (!content) return null;

  const markdown = typeof content === 'string' ? content : String(content);

  return (
    <div className={className}>
      <Markdown
        options={{
          overrides: {
            img: {
              component: (props) => (
                <BodyContentImage {...props} className={imageClassName} />
              ),
            },
            a: {
              component: (props) => (
                <a
                  {...props}
                  className={linkClassName}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
            },
          },
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
