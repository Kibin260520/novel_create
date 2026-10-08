import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { NovelSummary } from '@/types/data'

/**
 * 书封颜色：仿布面精装的低饱和色，不用渐变紫那种「AI 味」配色。
 * 选色只由小说 id 决定，所以同一本书每次渲染颜色一致。
 */
const BOOK_CLOTHS = [
  '#7c3b34', // 绛红
  '#3f5468', // 靛青
  '#5b6b45', // 橄榄
  '#8a6a3b', // 赭石
  '#574a63', // 紫褐
  '#2f4f4a', // 墨绿
  '#8c4a3c', // 砖红
  '#414654', // 石青
  '#6b4a3a', // 咖
  '#4a5b63', // 灰蓝
]

function clothOf(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return BOOK_CLOTHS[h % BOOK_CLOTHS.length]
}

interface Props {
  novel: NovelSummary
  className?: string
}

/**
 * 书封。有封面图就用图；没有（或图挂了）就用书名自动排一张布面精装封面，
 * 保证书架上不会出现破图或空框。
 */
export function BookCover({ novel, className }: Props) {
  const [broken, setBroken] = useState(false)
  const cloth = clothOf(novel.id)
  const useImage = !!novel.cover && !broken

  return (
    <div className={`book-cover${className ? ` ${className}` : ''}`}>
      {useImage ? (
        <img src={novel.cover} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="book-cover-gen" style={{ ['--tone' as string]: cloth } as CSSProperties}>
          <div className="gen-inner">
            <span className="gen-rule" />
            <div className="gen-title">{novel.title}</div>
            <span className="gen-rule" />
          </div>
          {novel.author && <div className="gen-author">{novel.author}</div>}
        </div>
      )}
    </div>
  )
}
