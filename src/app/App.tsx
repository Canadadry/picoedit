import { NavLink, Navigate, Outlet, Route, Routes } from "react-router";
import { CartProvider } from "./state/CartContext.tsx";
import { FileTab } from "./file/FileTab.tsx";
import { CodeTab } from "./code/CodeTab.tsx";
import { SpriteTab } from "./sprite/SpriteTab.tsx";
import { GffTab } from "./gff/GffTab.tsx";
import { MapTab } from "./map/MapTab.tsx";
import { SfxTab } from "./sfx/SfxTab.tsx";
import { MusicTab } from "./music/MusicTab.tsx";
import { cn } from "./lib/utils.ts";

const TABS = [
  { path: "/file", label: "File" },
  { path: "/code", label: "Code" },
  { path: "/sprite", label: "Sprite" },
  { path: "/gff", label: "GFF" },
  { path: "/map", label: "Map" },
  { path: "/sfx", label: "Sfx" },
  { path: "/music", label: "Music" },
];

function TabBar() {
  return (
    <nav className="flex gap-1 border-b border-neutral-800 bg-neutral-950 px-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            cn(
              "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-100",
              isActive && "border-blue-500 text-neutral-100",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-900 text-neutral-100">
      <TabBar />
      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <CartProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/file" replace />} />
          <Route path="file" element={<FileTab />} />
          <Route path="code" element={<CodeTab />} />
          <Route path="sprite" element={<SpriteTab />} />
          <Route path="gff" element={<GffTab />} />
          <Route path="map" element={<MapTab />} />
          <Route path="sfx" element={<SfxTab />} />
          <Route path="music" element={<MusicTab />} />
        </Route>
      </Routes>
    </CartProvider>
  );
}
