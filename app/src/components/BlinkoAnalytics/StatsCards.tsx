import { Card, CardBody } from "@heroui/react"
import { observer } from "mobx-react-lite"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "framer-motion"
import { useMemo } from "react"
import { Icon } from '@/components/Common/Iconify/icons'

interface StatsCardsProps {
  stats: {
    noteCount?: number
    totalWords?: number
    maxDailyWords?: number
    activeDays?: number
  }
}

interface StatCardProps {
  label: string
  value: number
  delay?: number
  gradient: string
  icon: string
}

const gradients = [
  "from-[#FF6B6B] via-[#4ECDC4] to-[#45B7D1]",
  "from-[#08AEEA] via-[#2AF598] to-[#4FACFE]",
  "from-[#FF9A8B] via-[#FF6A88] to-[#FF99AC]",
  "from-[#A9C9FF] via-[#FFBBEC] to-[#F3A0F7]",
  "from-[#21D4FD] via-[#2876F9] to-[#B721FF]",
  "from-[#FEE140] via-[#FA709A] to-[#FF8177]"
]

// One quiet card per figure: the label in secondary text, the number in the body colour with
// tabular figures. `gradient` is kept in the props for callers but no longer painted.
const StatCard = ({ label, value, delay = 0, icon }: StatCardProps) => {
  return (
    <Card className="bg-card" shadow="sm" radius="lg">
      <CardBody className="gap-1.5 px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-desc">
          <Icon icon={icon} width="15" height="15" />
          <p className="text-[12px] font-medium">{label}</p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={value}
            className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut', delay }}
          >
            {value.toLocaleString()}
          </motion.p>
        </AnimatePresence>
      </CardBody>
    </Card>
  )
}

export const StatsCards = observer(({ stats }: StatsCardsProps) => {
  const { t } = useTranslation()
  
  const randomGradients = useMemo(() => {
    const indices = Array.from({ length: gradients.length }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      //@ts-ignore
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices.slice(0, 4).map(i => gradients[i]!)
  }, [])
  
  const statItems = [
    { label: t('note-count'), value: stats?.noteCount ?? 0, delay: 0, gradient: randomGradients[0]!, icon: 'ri:file-list-3-line' },
    { label: t('total-words'), value: stats?.totalWords ?? 0, delay: 0.1, gradient: randomGradients[1]!, icon: 'ri:file-text-line' },
    { label: t('max-daily-words'), value: stats?.maxDailyWords ?? 0, delay: 0.2, gradient: randomGradients[2]!, icon: 'ri:line-chart-line' },
    { label: t('active-days'), value: stats?.activeDays ?? 0, delay: 0.3, gradient: randomGradients[3]!, icon: 'ri:calendar-check-line' }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  )
}) 