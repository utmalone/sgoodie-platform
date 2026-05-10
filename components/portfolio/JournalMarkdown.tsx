'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '@/styles/public/JournalPostPage.module.css';

type JournalMarkdownProps = {
  markdown: string;
};

export function JournalMarkdown({ markdown }: JournalMarkdownProps) {
  if (!markdown?.trim()) return null;

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 className={styles.mdH2}>{children}</h2>,
          h3: ({ children }) => <h3 className={styles.mdH3}>{children}</h3>,
          p: ({ children }) => <p className={styles.mdP}>{children}</p>,
          a: ({ href, children }) => (
            <a href={href} className={styles.mdLink} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className={styles.mdStrong}>{children}</strong>,
          em: ({ children }) => <em className={styles.mdEm}>{children}</em>,
          ul: ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
          ol: ({ children }) => <ol className={styles.mdOl}>{children}</ol>,
          li: ({ children }) => <li className={styles.mdLi}>{children}</li>
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
