const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const resumenPath = path.join(projectRoot, 'resumen.md');
let resumenContent = fs.readFileSync(resumenPath, 'utf8');

// Truncate old auto-generated sections to prevent duplicate appends
const splitIndex = resumenContent.indexOf('## 6. Arquitectura del Sistema (Diagrama)');
const splitIndex2 = resumenContent.indexOf('## 7. Arquitectura del Sistema (Diagrama)');
const targetIndex = splitIndex !== -1 ? splitIndex : splitIndex2;
if (targetIndex !== -1) {
  resumenContent = resumenContent.substring(0, targetIndex).trim() + '\n';
}

const mermaidDiagram = '\n## 6. Arquitectura del Sistema (Diagrama)\n\n' +
'```mermaid\n' +
'graph TD;\n' +
'    subgraph Frontend [Frontend: React + Vite + Tailwind v4]\n' +
'        UI[App.tsx - Interfaz de Usuario]\n' +
'        Store[Zustand - useDailyLogStore]\n' +
'        API_Client[Axios - api.ts]\n' +
'        \n' +
'        UI -->|Lee/Escribe| Store\n' +
'        UI -->|Llama| API_Client\n' +
'    end\n\n' +
'    subgraph Backend [Backend: NestJS]\n' +
'        Controller[Controladores REST]\n' +
'        Service[Servicios - Lógica de Negocio]\n' +
'        Prisma[Prisma ORM v6]\n' +
'        \n' +
'        API_Client -->|HTTP GET/POST| Controller\n' +
'        Controller --> Service\n' +
'        Service --> Prisma\n' +
'    end\n\n' +
'    subgraph Base de Datos [SQLite]\n' +
'        DB[(dev.db)]\n' +
'    end\n\n' +
'    Prisma -->|Lee/Escribe| DB\n' +
'```\n';

const connectionExplanation = '\n## 7. Conexión Backend y Frontend Profundizada\n\n' +
'El sistema opera bajo un modelo **Cliente-Servidor** clásico utilizando una arquitectura **RESTful**. Todo fluye en milisegundos gracias a la separación de responsabilidades:\n\n' +
'1.  **Frontend (El Cliente - React):** Es una Single Page Application (SPA). Cuando el usuario realiza una acción (por ejemplo, escribir "Manzana" en el buscador), el componente `App.tsx` detecta el evento `onChange`.\n' +
'2.  **Capa de Red (Axios):** `App.tsx` delega la petición a una función limpia en `frontend/src/api/api.ts`. Esta función utiliza la librería `axios` para enviar una petición HTTP tipo GET al servidor local (ej: `http://localhost:3000/food-catalog/search?q=Manzana`).\n' +
'3.  **Backend (El Servidor - NestJS):** El servidor NestJS, ejecutándose en el puerto 3000, intercepta esta petición HTTP. El decorador `@Get(\'search\')` en el `FoodCatalogController` captura la ruta y extrae la palabra "Manzana" del `@Query(\'q\')`.\n' +
'4.  **Lógica de Negocio (Servicios):** El controlador le pasa la palabra "Manzana" al `FoodCatalogService`. Es aquí donde reside la lógica principal.\n' +
'5.  **ORM (El Puente - Prisma):** El Servicio no habla SQL directamente, utiliza `PrismaClient`. Prisma traduce la intención de búsqueda a una consulta segura para SQLite: busca alimentos cuyo nombre contenga "Manzana" ignorando mayúsculas/minúsculas.\n' +
'6.  **Respuesta al Frontend:** SQLite retorna los datos, Prisma se los entrega al Servicio, este al Controlador, quien los empaqueta como una respuesta JSON al Frontend. \n' +
'7.  **Actualización Reactiva:** Axios recibe el JSON en el Frontend. `App.tsx` guarda estos resultados usando `setSearchResults(res.data)`, y React automáticamente repinta la interfaz mostrando la lista debajo del buscador. Todo sin recargar la página.\n';

const codeSectionHeader = '\n## 8. Código Fuente Completo del Proyecto\n\n' +
'A continuación se detalla todo el código fuente principal empleado para desarrollar este sistema, dividido por Backend y Frontend. Se han excluido archivos auto-generados pesados (como package-lock.json o migraciones SQL) para enfocar en la lógica desarrollada.\n';

resumenContent += '\n' + mermaidDiagram + '\n' + connectionExplanation + '\n' + codeSectionHeader + '\n';

function appendFilesFromDir(dir, extensions) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (file.name !== 'node_modules' && file.name !== 'dist' && file.name !== 'migrations' && file.name !== '.git') {
        appendFilesFromDir(fullPath, extensions);
      }
    } else {
      const ext = path.extname(file.name);
      if (extensions.includes(ext) && !file.name.endsWith('.spec.ts') && !file.name.endsWith('e2e-spec.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
        
        let mdExt = ext.substring(1);
        if (ext === '.ts' || ext === '.tsx') mdExt = 'typescript';
        else if (ext === '.prisma') mdExt = 'graphql';
        
        resumenContent += '\n### ' + relativePath + '\n\n```' + mdExt + '\n' + content + '\n```\n';
      }
    }
  }
}

// Append Backend Files
resumenContent += '\n### --- BACKEND ---\n';
appendFilesFromDir(path.join(projectRoot, 'backend/src'), ['.ts']);
appendFilesFromDir(path.join(projectRoot, 'backend/prisma'), ['.ts', '.prisma']);
resumenContent += '\n### backend/package.json\n\n```json\n' + fs.readFileSync(path.join(projectRoot, 'backend/package.json'), 'utf8') + '\n```\n';

// Append Frontend Files
resumenContent += '\n### --- FRONTEND ---\n';
appendFilesFromDir(path.join(projectRoot, 'frontend/src'), ['.ts', '.tsx', '.css']);
resumenContent += '\n### frontend/index.html\n\n```html\n' + fs.readFileSync(path.join(projectRoot, 'frontend/index.html'), 'utf8') + '\n```\n';
resumenContent += '\n### frontend/package.json\n\n```json\n' + fs.readFileSync(path.join(projectRoot, 'frontend/package.json'), 'utf8') + '\n```\n';
resumenContent += '\n### frontend/vite.config.ts\n\n```typescript\n' + fs.readFileSync(path.join(projectRoot, 'frontend/vite.config.ts'), 'utf8') + '\n```\n';

fs.writeFileSync(resumenPath, resumenContent);
console.log('Resumen actualizado exitosamente con todo el código.');
