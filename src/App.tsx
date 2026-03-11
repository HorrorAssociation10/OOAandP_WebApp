// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Gallery from "./screens/Gallery";
import Editor from "./screens/Editor";
import NotFound from "./screens/NotFound";
import "./App.css";

// function App() {
//   const [greetMsg, setGreetMsg] = useState("");
//   const [name, setName] = useState("");

//   async function greet() {
//     // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
//     setGreetMsg(await invoke("greet", { name }));
//   }

//   return (
//     <main className="container">
//       <h1>Welcome to Tauri + React</h1>

//       <div className="row">
//         <a href="https://vite.dev" target="_blank">
//           <img src="/vite.svg" className="logo vite" alt="Vite logo" />
//         </a>
//         <a href="https://v2.tauri.app" target="_blank">
//           <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <p>Click on the Tauri, Vite, and React logos to learn more.</p>

//       <form
//         className="row"
//         onSubmit={(e) => {
//           e.preventDefault();
//           greet();
//         }}
//       >
//         <input
//           id="greet-input"
//           onChange={(e) => setName(e.currentTarget.value)}
//           placeholder="Enter a name..."
//         />
//         <button type="submit">Greet</button>
//         <button>I'm a button</button>
//       </form>
//       <p>{greetMsg}</p>
//     </main>
//   );
// }

function App(){
  return (
    <BrowserRouter>
    <nav>
      <div className="header">
        <Link to={`/`}>Gallery</Link>
        <Link to={`/editor/:id`}>Editor</Link>
      </div>
    </nav>
    <Routes>
      <Route path="/" element={<Gallery />}/>
      <Route path="/editor/:id" element={<Editor />}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>
    </BrowserRouter>
  )
}

export default App;
