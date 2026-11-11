import { Activity, Building2, LayoutDashboard, SlidersHorizontal } from 'lucide-react'

type CampusNavItem = 'overview' | 'buildings' | 'utilization' | 'simulation'

interface CampusNavigationProps {
  activeItem: CampusNavItem
  onNavigate: (item: CampusNavItem) => void
}

const items: Array<{ id: CampusNavItem; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Campus Overview', icon: LayoutDashboard },
  { id: 'buildings', label: 'Buildings', icon: Building2 },
  { id: 'utilization', label: 'Room Utilization', icon: Activity },
  { id: 'simulation', label: 'Simulation', icon: SlidersHorizontal },
]

export function CampusNavigation({ activeItem, onNavigate }: CampusNavigationProps) {
  return (
    <nav className="campus-navigation" aria-label="Campus sections">
      <p className="campus-navigation__title">WORKSPACE</p>
      {items.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className={`campus-navigation__item${activeItem === id ? ' is-active' : ''}`} aria-current={activeItem === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
          <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
        </button>
      ))}
      <div className="campus-navigation__footer"><span className="nav-status-dot" />DIGITAL TWIN<br />MODEL READY</div>
    </nav>
  )
}
