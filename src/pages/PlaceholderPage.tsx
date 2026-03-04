import { Construction } from 'lucide-react'

interface Props {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-3">
        <Construction className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground max-w-sm">{description}</p>
      </div>
    </div>
  )
}
