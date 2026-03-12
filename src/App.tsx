import { useAppStore } from "./store";
import LibraryView from "./views/LibraryView";

function App() {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <div>
      {currentView === "library" && <LibraryView />}
      {currentView === "book" && <div>Book view coming soon</div>}
    </div>
  );
}

export default App;
