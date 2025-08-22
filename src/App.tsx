import { useMemo, useRef, useState, useEffect } from "react";
import {
  Paintbrush,
  Replace,
  RotateCw,
  RefreshCw,
  Grid3X3,
  Image as ImageIcon,
  Shuffle,
  Share,
} from "lucide-react";
import * as htmlToImage from "html-to-image";

import "./index.css";

const Button = ({
  className = "",
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) => (
  <button
    className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-sm hover:shadow-md border border-gray-200 text-sm font-medium active:scale-[.98] bg-white ${className}`}
    {...props}
  >
    {children}
  </button>
);

const TILES = [
  { id: "black-vert", name: "Black Straight" },
  { id: "black-diag", name: "Black Diagonal" },
  { id: "orange-vert", name: "Orange Straight" },
  { id: "orange-diag", name: "Orange Diagonal" },
  { id: "lavender-vert", name: "Lavender Straight" },
  { id: "lavender-diag", name: "Lavender Diagonal" },
  { id: "green-vert", name: "Green Straight" },
  { id: "green-diag", name: "Green Diagonal" },
  { id: "gray-vert", name: "Gray Straight" },
  { id: "gray-diag", name: "Gray Diagonal" },
  { id: "red-vert", name: "Red Straight" },
  { id: "red-diag", name: "Red Diagonal" },
  { id: "framework-logo", name: "Framework Logo" },
  { id: "amd", name: "AMD" },
  { id: "tux", name: "Linux Tux" },
  { id: "arch", name: "Arch Linux" },
  { id: "linux-mint", name: "Linux Mint" },
  { id: "happy-earth", name: "Happy Earth" },
  { id: "touch-grass", name: "Touch Grass" },
  { id: "rainbow-heart", name: "Rainbow Heart" },
  { id: "blank", name: "Blank" },
];

// A cell stores a tileId and a rotation (deg)
const makeEmptyGrid = () =>
  Array.from({ length: 21 }, () => ({ tileId: "blank", rot: 0 }));

export default function App() {
  const [grid, setGrid] = useState(makeEmptyGrid());
  const [selectedTileId, setSelectedTileId] = useState(TILES[1]?.id || "blank");
  const [tool, setTool] = useState("paint"); // paint | swap | rotate
  const [swapAnchor, setSwapAnchor] = useState<number | null>(null);
  const [modifierTool, setModifierTool] = useState<string | null>(null);

  const shotRef = useRef<HTMLDivElement>(null); // for PNG export
  const catalog = useMemo(() => TILES, []);

  // Actions
  const applyPaint = (idx: number) => {
    setGrid((g) =>
      g.map((c, i) =>
        i === idx ? { ...c, tileId: selectedTileId, rot: 0 } : c,
      ),
    );
  };

  const applyRotate = (idx: number) => {
    setGrid((g) =>
      g.map((c, i) => (i === idx ? { ...c, rot: (c.rot + 90) % 360 } : c)),
    );
  };

  const randomizeGrid = () => {
    const getRandomTile = () =>
      catalog[Math.floor(Math.random() * catalog.length)];
    const getRandomRotation = () => {
      const rotations = [0, 90, 180, 270];
      return rotations[Math.floor(Math.random() * rotations.length)];
    };

    setGrid(() =>
      Array.from({ length: 21 }, () => {
        const tile = getRandomTile();
        return {
          tileId: tile?.id || "blank",
          rot: getRandomRotation() as number,
        };
      }),
    );
  };

  const handleCellClick = (idx: number, event?: React.MouseEvent) => {
    // Modifier key shortcuts (work regardless of current tool)
    if (event?.shiftKey) {
      return applyRotate(idx);
    }

    if (event?.ctrlKey || event?.metaKey) {
      // Ctrl+click for swap mode
      if (swapAnchor === null) {
        setSwapAnchor(idx);
        return;
      }
      if (swapAnchor === idx) {
        setSwapAnchor(null);
        return;
      }
      setGrid((g) => {
        const next = [...g];
        const tmp = next[idx];
        const anchor = next[swapAnchor];
        if (tmp && anchor) {
          next[idx] = anchor;
          next[swapAnchor] = tmp;
        }
        return next;
      });
      setSwapAnchor(null);
      return;
    }

    // Regular tool behavior
    if (tool === "paint") return applyPaint(idx);
    if (tool === "rotate") return applyRotate(idx);
    if (tool === "swap") {
      if (swapAnchor === null) {
        setSwapAnchor(idx);
        return;
      }
      if (swapAnchor === idx) {
        setSwapAnchor(null);
        return;
      }
      setGrid((g) => {
        const next = [...g];
        const tmp = next[idx];
        const anchor = next[swapAnchor];
        if (tmp && anchor) {
          next[idx] = anchor;
          next[swapAnchor] = tmp;
        }
        return next;
      });
      setSwapAnchor(null);
    }
  };

  const downloadPNG = async () => {
    if (!shotRef.current) {
      alert("Error: Unable to capture design for export");
      return;
    }

    try {
      const dataUrl = await htmlToImage.toPng(shotRef.current, {
        quality: 1.0,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = "framework-tiles-design.png";
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("PNG Export Error:", error);
      alert(
        "PNG export failed. Please try using your browser's screenshot tool instead.",
      );
    }
  };

  // URL state management
  const encodeGridToUrl = () => {
    const gridData = grid.map((cell) => `${cell.tileId}:${cell.rot}`).join(",");
    return btoa(gridData); // Base64 encode
  };

  const decodeUrlToGrid = (encodedData: string | null) => {
    if (!encodedData) return null;
    try {
      const gridData = atob(encodedData); // Base64 decode
      const cells = gridData.split(",").map((cellStr) => {
        const [tileId, rot] = cellStr.split(":");
        return { tileId: tileId || "blank", rot: parseInt(rot!) || 0 };
      });
      return cells.length === 21 ? cells : null;
    } catch {
      return null;
    }
  };

  const shareLayout = () => {
    const encodedGrid = encodeGridToUrl();
    const shareUrl = `${window.location.origin}${window.location.pathname}?layout=${encodedGrid}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          alert("Share URL copied to clipboard!");
        })
        .catch(() => {
          fallbackCopyToClipboard(shareUrl);
        });
    } else {
      fallbackCopyToClipboard(shareUrl);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (successful) {
        alert("Share URL copied to clipboard!");
      } else {
        alert(`Copy failed. Please copy this URL manually:\n\n${text}`);
      }
    } catch (err) {
      alert(`Copy failed. Please copy this URL manually:\n\n${text}`);
    }
  };

  // Load layout from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const layoutParam = urlParams.get("layout");

    const decodedGrid = decodeUrlToGrid(layoutParam);
    if (decodedGrid) {
      setGrid(decodedGrid);
    }
  }, []);

  // Update URL when grid changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const encodedGrid = encodeGridToUrl();
      const newUrl = `${window.location.pathname}?layout=${encodedGrid}`;
      window.history.replaceState({}, "", newUrl);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [grid]);

  // Keyboard shortcuts and modifier key detection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger tool switching if not in an input field
      if (
        !(
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        )
      ) {
        switch (event.key.toLowerCase()) {
          case "p":
            setTool("paint");
            setSwapAnchor(null);
            break;
          case "s":
            setTool("swap");
            setSwapAnchor(null);
            break;
          case "r":
            setTool("rotate");
            setSwapAnchor(null);
            break;
        }
      }

      // Modifier key detection (works regardless of focus)
      if (event.shiftKey) {
        setModifierTool("rotate");
      } else if (event.ctrlKey || event.metaKey) {
        setModifierTool("swap");
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Clear modifier tool when keys are released
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        setModifierTool(null);
        // Cancel any pending swap when modifiers are released
        if (swapAnchor !== null) {
          setSwapAnchor(null);
        }
      } else if (event.shiftKey) {
        setModifierTool("rotate");
      } else if (event.ctrlKey || event.metaKey) {
        setModifierTool("swap");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [swapAnchor]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header Bar */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Grid3X3 className="w-5 h-5" />
            <h1 className="text-lg font-semibold">
              Framework Desktop Tile Designer
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setGrid(makeEmptyGrid())}
              className="text-xs px-3 py-2"
            >
              <RefreshCw className="w-3 h-3" />
              Clear
            </Button>
            <Button
              onClick={randomizeGrid}
              className="text-purple-600 hover:text-purple-700 text-xs px-3 py-2"
            >
              <Shuffle className="w-3 h-3" />
              Random
            </Button>
            <Button onClick={downloadPNG} className="text-xs px-3 py-2">
              <ImageIcon className="w-3 h-3" />
              PNG
            </Button>
            <Button
              onClick={shareLayout}
              className="text-blue-600 hover:text-blue-700 text-xs px-3 py-2"
            >
              <Share className="w-3 h-3" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 pb-0">
            <h3 className="font-medium mb-4 text-sm">Tools</h3>

            {/* Tools Section */}
            <div className="flex rounded-2xl border border-gray-200 overflow-hidden mb-6">
              <button
                className={`flex-1 text-xs px-2 py-2.5 flex flex-col items-center gap-1 transition-colors focus:outline-none ${(tool === "paint" && !modifierTool) || modifierTool === "paint" ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
                onClick={() => {
                  setTool("paint");
                  setSwapAnchor(null);
                }}
              >
                <Paintbrush className="w-3 h-3" />
                <span className="font-medium">Paint</span>
                <kbd className="text-[10px] opacity-60">P</kbd>
              </button>
              <button
                className={`flex-1 text-xs px-2 py-2.5 flex flex-col items-center gap-1 transition-colors border-l border-r border-gray-200 focus:outline-none ${(tool === "swap" && !modifierTool) || modifierTool === "swap" ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
                onClick={() => {
                  setTool("swap");
                  setSwapAnchor(null);
                }}
              >
                <Replace className="w-3 h-3" />
                <span className="font-medium">
                  Swap{swapAnchor !== null ? " (1/2)" : ""}
                </span>
                <kbd className="text-[10px] opacity-60">S</kbd>
              </button>
              <button
                className={`flex-1 text-xs px-2 py-2.5 flex flex-col items-center gap-1 transition-colors focus:outline-none ${(tool === "rotate" && !modifierTool) || modifierTool === "rotate" ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
                onClick={() => {
                  setTool("rotate");
                  setSwapAnchor(null);
                }}
              >
                <RotateCw className="w-3 h-3" />
                <span className="font-medium">Rotate</span>
                <kbd className="text-[10px] opacity-60">R</kbd>
              </button>
            </div>

            {/* Quick Tips */}
            <div className="text-[10px] text-gray-500 mb-6 space-y-1">
              <div>
                💡 <strong>Shift+click</strong> to rotate tiles
              </div>
              <div>
                💡 <strong>Ctrl+click</strong> to swap tiles
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 mb-6"></div>

            {/* Palette Section Header */}
            <h3 className="font-medium mb-4 text-sm">Palette</h3>
          </div>
          
          {/* Scrollable Palette Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {catalog.map((t) => (
                <button
                  key={t.id}
                  className={`relative rounded-lg overflow-hidden border transition-all focus:outline-none ${selectedTileId === t.id ? "border-black ring-2 ring-black/20" : "border-gray-200 hover:border-gray-300"}`}
                  onClick={() => {
                    setSelectedTileId(t.id);
                    setTool("paint");
                  }}
                  title={t.name}
                >
                <img
                  src={`./assets/tiles/${t.id}.jpg`}
                  alt={t.name}
                  className="w-full aspect-square object-cover"
                />
                  <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-white/90 py-0.5 font-medium line-clamp-1">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 p-6 flex items-center justify-center">
          <div ref={shotRef} className="relative max-w-4xl w-full">
            <img
              src="./assets/framework-laptop-bg.jpg"
              alt="Framework Desktop Background"
              className="w-full rounded-2xl object-contain select-none"
            />

            <div
              className="absolute grid"
              style={{
                gridTemplateColumns: `repeat(3, minmax(0, 1fr))`,
                left: "30%",
                right: "30%",
                top: "9%",
                bottom: "16%",
              }}
            >
              {Array.from({ length: 21 }).map((_, idx) => {
                const cell = grid[idx];
                const tile =
                  catalog.find((t) => t.id === cell?.tileId) || catalog[0];
                return (
                  <div
                    key={idx}
                    className={`w-full aspect-square overflow-hidden bg-gray-900 flex items-center justify-center cursor-pointer focus:outline-none relative ${swapAnchor === idx ? "ring-4 ring-orange-400 ring-opacity-80 z-10" : ""}`}
                    title={`Cell ${idx + 1}${swapAnchor === idx ? " (Selected for swap)" : swapAnchor !== null && tool === "swap" ? " - Click to swap" : ""}`}
                    onClick={(e) => handleCellClick(idx, e)}
                    tabIndex={0}
                  >
                    <img
                      src={`./assets/tiles/${tile?.id}.jpg`}
                      alt={tile?.name}
                      className="w-full h-full object-cover"
                      style={{ transform: `rotate(${cell?.rot || 0}deg)` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
