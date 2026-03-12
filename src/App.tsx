import { useAppStore } from "./store";
import LibraryView from "./views/LibraryView";
import BookView from "./views/BookView";

function App() {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <div>
      {currentView === "library" && <LibraryView />}
      {currentView === "book" && <BookView />}
    </div>
  );
}

export default App;