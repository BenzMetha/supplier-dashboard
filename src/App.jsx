import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './store.jsx';
import Layout from './components.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import ProjectForm from './pages/ProjectForm.jsx';
import FactoryDatabase from './pages/FactoryDatabase.jsx';
import FactoryDetail from './pages/FactoryDetail.jsx';
import FactoryForm from './pages/FactoryForm.jsx';
import Settings from './pages/Settings.jsx';
import TeamMembers from './pages/TeamMembers.jsx';

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"                      element={<Dashboard />} />
            <Route path="/projects/new"          element={<ProjectForm />} />
            <Route path="/projects/:id"          element={<ProjectDetail />} />
            <Route path="/projects/:id/edit"     element={<ProjectForm />} />
            <Route path="/factories"             element={<FactoryDatabase />} />
            <Route path="/factories/new"         element={<FactoryForm />} />
            <Route path="/factories/:id"         element={<FactoryDetail />} />
            <Route path="/factories/:id/edit"    element={<FactoryForm />} />
            <Route path="/team"                  element={<TeamMembers />} />
            <Route path="/settings"              element={<Settings />} />
            <Route path="*"                      element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </StoreProvider>
  );
}
