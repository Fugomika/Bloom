const COLS = ['#FBBF24','#F59E0B','#22C55E','#F97316','#EF4444','#8B5CF6','#84CC16']

export function confetti() {
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div')
    el.className = 'conf'
    const sz = 5 + Math.random() * 8
    el.style.cssText = `left:${Math.random()*100}vw;top:${10+Math.random()*50}vh;width:${sz}px;height:${sz}px;background:${COLS[Math.floor(Math.random()*COLS.length)]};border-radius:${Math.random()>.5?'50%':'2px'};animation-delay:${Math.random()*.35}s;animation-duration:${.55+Math.random()*.65}s`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1300)
  }
}
