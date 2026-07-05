import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Папка сессии относительно корня проекта
const folderPath = path.join(
    projectRoot,
    'main',
    'Session [2026.07.05 06⁚59⁚43] Alchemy of Creativity  НейронкаАрты'
);

const absolutePath = path.resolve(folderPath);

console.log('Корень проекта:', projectRoot);
console.log('Путь к папке:  ', absolutePath);
console.log('Папка существует:', fs.existsSync(absolutePath));
console.log('');

// Способ 1: explorer.exe через spawn (detached) — как в main.js
function openMethod1() {
    console.log('→ Способ 1: spawn explorer.exe (detached)');

    const child = spawn('explorer.exe', [absolutePath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });

    child.on('error', (err) => console.log('  Ошибка:', err.message));
    child.unref();
}

// Способ 2: explorer.exe через execFile
function openMethod2() {
    console.log('→ Способ 2: execFile explorer.exe');

    execFile('explorer.exe', [absolutePath], { windowsHide: true }, (err) => {
        if (err) console.log('  Ошибка:', err.message);
        else console.log('  execFile завершился без ошибки');
    });
}

// Способ 3: cmd start — часто надёжнее для путей с пробелами и скобками
function openMethod3() {
    console.log('→ Способ 3: cmd /c start');

    const child = spawn('cmd.exe', ['/c', 'start', '', absolutePath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });

    child.on('error', (err) => console.log('  Ошибка:', err.message));
    child.unref();
}

// Способ 4: PowerShell Start-Process
function openMethod4() {
    console.log('→ Способ 4: PowerShell Start-Process explorer');

    const psCommand = `Start-Process explorer.exe -ArgumentList '${absolutePath.replace(/'/g, "''")}'`;
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });

    child.on('error', (err) => console.log('  Ошибка:', err.message));
    child.unref();
}

const method = process.argv[2] ?? '1';

const methods = {
    '1': openMethod1,
    '2': openMethod2,
    '3': openMethod3,
    '4': openMethod4,
    'all': () => {
        openMethod1();
        setTimeout(openMethod2, 1500);
        setTimeout(openMethod3, 3000);
        setTimeout(openMethod4, 4500);
    }
};

if (!methods[method]) {
    console.log('Использование: node test.js [1|2|3|4|all]');
    console.log('  1 — spawn explorer (по умолчанию)');
    console.log('  2 — execFile explorer');
    console.log('  3 — cmd start');
    console.log('  4 — PowerShell Start-Process');
    console.log('  all — все способы по очереди');
    process.exit(1);
}

if (!fs.existsSync(absolutePath)) {
    console.log('⚠️ Папка не найдена. Проверьте имя сессии в test.js');
    process.exit(1);
}

methods[method]();

if (method === '2') {
    setTimeout(() => process.exit(0), 3000);
}
