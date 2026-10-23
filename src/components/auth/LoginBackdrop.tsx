import { useEffect, useRef, useState } from 'react'

/**
 * 登录页的动态背景视频。
 *
 * 只给桌面端用，理由有三：
 * 1. 手机屏幕窄，视频被 object-fit: cover 裁得只剩中间一块，看不出内容；
 * 2. 手机流量与首屏预算都紧，没必要为装饰再下一个文件；
 * 3. 竖屏下登录卡片几乎占满，背景根本露不出来。
 *
 * 所以这里用 matchMedia 判断 —— **不满足就压根不渲染 video 元素**，
 * 而不是渲染出来再 display:none（那样照样会下载）。
 * 手机端继续用原来的极光渐变背景，视觉不断层。
 */

const BASE = import.meta.env.BASE_URL || '/'
const VIDEO_SRC = `${BASE}media/login-bg.mp4`
const POSTER_SRC = `${BASE}media/login-bg.jpg`

/** 低于这个宽度就不加载：平板竖屏（768）也算窄 */
const MIN_WIDTH = 900

export function LoginBackdrop({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [mount, setMount] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [ready, setReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const wide = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sync = () => {
      setMount(wide.matches)
      setReduceMotion(calm.matches)
    }
    sync()
    wide.addEventListener('change', sync)
    calm.addEventListener('change', sync)
    return () => {
      wide.removeEventListener('change', sync)
      calm.removeEventListener('change', sync)
    }
  }, [])

  // 背景亮起来后，卡片得同时变实一点，否则壁画纹理透上来、小字全糊
  useEffect(() => {
    onActiveChange?.(mount)
  }, [mount, onActiveChange])

  // 系统开了「减弱动态效果」就停在首帧：装饰性动画不该跟无障碍偏好对着干
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (reduceMotion) {
      el.pause()
      el.currentTime = 0
    } else {
      // 某些浏览器（Safari）在元素刚插入时 play() 会被拒，顺手兜一下
      void el.play().catch(() => {
        /* 自动播放被拦：留着 poster 也够看 */
      })
    }
  }, [reduceMotion, mount])

  if (!mount) return null

  return (
    <div className={`login-bg${ready ? ' is-ready' : ''}`} aria-hidden="true">
      <video
        ref={videoRef}
        className="login-bg-video"
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        autoPlay={!reduceMotion}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        onCanPlay={() => setReady(true)}
      />
      {/* 遮罩：视频本身很亮，不压一层登录卡片会看不清 */}
      <div className="login-bg-veil" />
    </div>
  )
}
