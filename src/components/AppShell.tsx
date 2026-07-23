import * as React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  KanbanSquare,
  MessageCircle,
  Inbox,
  CheckCheck,
  Users,
  Package,
  BarChart3,
  Settings as SettingsIcon,
  Wrench,
  Search,
  Plus,
  Bell,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  MapPin,
  ShieldCheck,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useConversations } from '@/hooks/useMessages'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuthStore } from '@/features/auth/authStore'
import { useRoleStore, APP_ROLES } from '@/features/auth/roleStore'
import { useProfilePhotos } from '@/features/auth/profilePhotoStore'
import { useThemeStore } from '@/features/theme/themeStore'
import { useChatDock } from '@/features/messaging/chatDockStore'
import { ChatDock } from '@/features/messaging/ChatDock'
import { ChatsDropdown } from '@/features/messaging/ChatsDropdown'
import { NotificationsDropdown } from '@/features/notifications/NotificationsDropdown'
import { Avatar } from '@/components/ui/Avatar'
import { BrandLogo } from '@/components/BrandLogo'
import { UserSettingsModal } from '@/components/UserSettingsModal'
import { cn } from '@/lib/utils'

// NetSuite-style account identifier for the (fake) tenant company. Numeric and
// account-wide (not per-location). Placeholder until real provisioning exists.
// Sandbox convention for reference: a sandbox account would append a suffix,
// e.g. "8847302_SB1" (sandbox 1) or "8847302_RP" (release preview).
const ACCOUNT_ID = '8847302'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Nested sub-item (smaller, indented) rendered under the parent. */
  children?: { to: string; label: string; icon: LucideIcon }[]
}

// Calendar sits ABOVE Workflow (per spec). Backlog sits above Workflow, and
// "Completed / Invoiced" is a sub-item of Workflow. Messaging moved to the top
// bar + docked windows, so there is no Messages nav item. Default landing route
// stays Workflow.
const NAV_ITEMS: NavItem[] = [
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/backlog', label: 'Backlog', icon: Inbox },
  {
    to: '/workflow',
    label: 'Workflow',
    icon: KanbanSquare,
    children: [{ to: '/workflow/completed', label: 'Completed / Invoiced', icon: CheckCheck }],
  },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const [userSettingsOpen, setUserSettingsOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const navigate = useNavigate()

  const { data: me } = useAuth()
  const { data: conversations } = useConversations()
  const { data: notifications } = useNotifications()
  const currentLocationId = useAuthStore((s) => s.currentLocationId)
  const setCurrentLocationId = useAuthStore((s) => s.setCurrentLocationId)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const role = useRoleStore((s) => s.role)
  const setRole = useRoleStore((s) => s.setRole)
  const toggleChats = useChatDock((s) => s.toggleDropdown)
  const chatsOpen = useChatDock((s) => s.dropdownOpen)
  const toggleNotifications = useChatDock((s) => s.toggleNotifications)
  const notificationsOpen = useChatDock((s) => s.notificationsOpen)
  const profilePhotos = useProfilePhotos((s) => s.photos)

  const myPhoto = me ? profilePhotos[me.user.id] : undefined

  const unreadTotal = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
  const notifUnread = (notifications ?? []).filter((n) => !n.read).length

  const userName = me
    ? `${me.user.firstName ?? ''} ${me.user.lastName ?? ''}`.trim() || me.user.email
    : 'Kevin Du'
  const activeLocation = me?.allLocations.find((l) => l.id === (currentLocationId ?? me?.locationId))

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) navigate(`/workflow?search=${encodeURIComponent(search.trim())}`)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* --- Company-blue sidebar rail --- */}
      <aside
        className={cn(
          'flex shrink-0 flex-col bg-gradient-to-b from-sidebar to-sidebar-strong text-sidebar-foreground transition-all',
          collapsed ? 'w-[72px]' : 'w-60',
        )}
      >
        <div className={cn('flex h-14 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
            <Wrench className="h-[18px] w-[18px]" />
          </div>
          {!collapsed && <span className="text-[15px] font-bold tracking-tight">AutoSuite</span>}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <React.Fragment key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/workflow'}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                </NavLink>

                {/* Indented, smaller sub-items (e.g. Workflow → Completed / Invoiced) */}
                {!collapsed &&
                  item.children?.map((child) => {
                    const ChildIcon = child.icon
                    return (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        aria-label={child.label}
                        className={({ isActive }) =>
                          cn(
                            'ml-4 flex items-center gap-2 rounded-lg py-1.5 pl-4 pr-3 text-[13px] font-medium transition-colors',
                            'border-l border-white/15',
                            isActive ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white',
                          )
                        }
                      >
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{child.label}</span>
                      </NavLink>
                    )
                  })}
              </React.Fragment>
            )
          })}
        </nav>

        {/* --- Bottom controls: theme toggle ABOVE collapse button --- */}
        <div className="space-y-1 border-t border-white/10 p-3">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>

          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* --- Main column --- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          {/* Company brand + location / account id + environment (LEFT of search).
              NetSuite-style: bold location name over the account id, with an
              environment pill (placeholder for a future Sandbox toggle). */}
          <div className="flex shrink-0 items-center gap-3">
            <BrandLogo />
            <div className="hidden h-8 w-px bg-border md:block" />
            <div className="hidden min-w-0 flex-col leading-tight md:flex">
              <span className="truncate text-base font-bold text-foreground">
                {activeLocation?.name ?? 'ABS Autobody'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  Account ID: {ACCOUNT_ID}
                </span>
                <span className="rounded-full bg-success/15 px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-success">
                  Production
                </span>
              </div>
            </div>
          </div>

          {/* Search — bounded to its visible width so the empty header area to
              its right stays plain header background (not a wide, focusable
              input). Previously `flex-1 max-w-lg` stretched the white field
              across the bar, so clicking that "empty" space focused the input
              and showed a text caret. */}
          <form onSubmit={handleSearchSubmit} className="w-full max-w-sm shrink">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Global search"
                aria-label="Global search"
                className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {/* Circular blue add button */}
            <div className="relative">
              <button
                onClick={() => setAddOpen((o) => !o)}
                aria-label="Create new"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                <Plus className="h-[22px] w-[22px]" />
              </button>
              {addOpen && (
                <div
                  className="absolute right-0 z-30 mt-2 w-52 rounded-md border border-border bg-popover p-1 shadow-pop animate-fade-in"
                  onMouseLeave={() => setAddOpen(false)}
                >
                  {[
                    { label: 'New Estimate', to: '/workflow?new=estimate' },
                    { label: 'New Appointment', to: '/calendar?new=appointment' },
                    { label: 'New Customer', to: '/customers?new=customer' },
                  ].map((a) => (
                    <button
                      key={a.label}
                      className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setAddOpen(false)
                        navigate(a.to)
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Messenger icon (LEFT of the bell) — opens the Chats dropdown,
                anchored to this button. Shows an active tinted state while open. */}
            <div className="relative">
              <button
                onClick={toggleChats}
                aria-expanded={chatsOpen}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors',
                  chatsOpen ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' : 'text-muted-foreground hover:bg-muted',
                )}
                aria-label={`Messages${unreadTotal ? ` (${unreadTotal} unread)` : ''}`}
              >
                <MessageCircle className="h-[22px] w-[22px]" />
                {unreadTotal > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold text-white">
                    {unreadTotal}
                  </span>
                )}
              </button>
              <ChatsDropdown />
            </div>

            {/* Bell — opens the Notifications dropdown anchored to this button.
                Same size + border as the messenger icon; red unread badge. */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                aria-expanded={notificationsOpen}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors',
                  notificationsOpen ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' : 'text-muted-foreground hover:bg-muted',
                )}
                aria-label={`Notifications${notifUnread ? ` (${notifUnread} unread)` : ''}`}
              >
                <Bell className="h-[22px] w-[22px]" />
                {notifUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                    {notifUnread}
                  </span>
                )}
              </button>
              <NotificationsDropdown />
            </div>

            {/* Profile block: avatar + name/role stacked + chevron */}
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-muted"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-label="Account menu"
              >
                <Avatar size="lg" name={userName} src={myPhoto} />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-semibold text-foreground">{userName}</span>
                  <span className="block text-xs text-muted-foreground">Role: {role}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-border bg-popover p-2 text-sm shadow-pop animate-fade-in"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <div className="flex items-center gap-2.5 px-2 py-1.5">
                    <Avatar size="lg" name={userName} src={myPhoto} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{userName}</p>
                      <p className="truncate text-xs text-muted-foreground">{me?.user.email ?? 'kevin@autosuite.dev'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Role: {role}</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-2">
                    <p className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> Role
                    </p>
                    {APP_ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        aria-pressed={r === role}
                        className={cn(
                          'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-muted',
                          r === role && 'font-medium text-primary-700 dark:text-primary-300',
                        )}
                      >
                        <span className="truncate">{r}</span>
                        {r === role && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>

                  {me && me.allLocations.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> Location
                      </p>
                      {me.allLocations.map((loc) => (
                        <button
                          key={loc.id}
                          onClick={() => {
                            setCurrentLocationId(loc.id)
                            setUserMenuOpen(false)
                          }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-muted',
                            loc.id === activeLocation?.id && 'font-medium text-primary-700 dark:text-primary-300',
                          )}
                        >
                          <span className="truncate">{loc.name}</span>
                          {loc.id === activeLocation?.id && <span className="text-xs">Current</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        setUserSettingsOpen(true)
                      }}
                      className="block w-full rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                    >
                      User Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Global Facebook-style messaging dock (launcher + chats + docked windows) */}
      <ChatDock />

      {/* User Settings modal (profile photo lives here now, not in the dropdown) */}
      <UserSettingsModal open={userSettingsOpen} onOpenChange={setUserSettingsOpen} />
    </div>
  )
}
