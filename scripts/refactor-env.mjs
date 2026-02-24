import fs from 'fs';
import path from 'path';

const files = [
    'app/routes/api.configured-providers.ts',
    'app/routes/api.chat.ts',
    'app/routes/api.export-api-keys.ts',
    'app/routes/api.system.git-info.ts',
    'app/routes/api.github-template.ts',
    'app/routes/api.github-user.ts',
    'app/routes/api.netlify-user.ts',
    'app/routes/api.github-stats.ts',
    'app/routes/api.vercel-user.ts',
    'app/routes/api.check-env-key.ts',
    'app/routes/api.enhancer.ts',
    'app/routes/api.supabase-user.ts',
    'app/routes/api.bug-report.ts',
    'app/routes/api.system.disk-info.ts',
    'app/routes/api.models.ts',
    'app/routes/api.github-branches.ts',
    'app/routes/api.llmcall.ts',
    'app/routes/api.system.diagnostics.ts',
    'app/lib/.server/auth.ts',
    'app/lib/security.ts',
    'app/lib/services/importExportService.ts'
];

for (const file of files) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    // Replace `globalThis.process.env` blocks introduced earlier
    if (content.match(/const actualProcess[\s\S]*?context\?\.cloudflare\?\.env \|\| \{\}\)/)) {
        content = content.replace(
            /const actualProcess = typeof globalThis !== 'undefined' \? globalThis\.process : undefined;\s*(const processEnv =[^;]+;)?\s*const serverEnv = Object\.assign\(\{\}, (?:actualProcess\?\.env \|\| \(typeof process !== 'undefined' \? process\.env : \{\}\)|processEnv), context\?\.cloudflare\?\.env \|\| \{\}\)( as any| as Record<string, string>)?;/g,
            'const serverEnv = getMergedServerEnv(context)$2;'
        );
        changed = true;
    }

    // Replace legacy `process.env` resolution for serverEnv
    if (content.match(/const processEnv =[^;]+;\s*const serverEnv = Object\.assign\(\{\}\s*,\s*processEnv\s*,\s*context\?\.cloudflare\?\.env \|\| \{\}\)( as any)?;/)) {
        content = content.replace(
            /const processEnv = typeof process !== 'undefined' \? process\.env : \{\};\s*const serverEnv = Object\.assign\(\{\}\s*,\s*processEnv\s*,\s*context\?\.cloudflare\?\.env \|\| \{\}\)( as any)?;/g,
            'const serverEnv = getMergedServerEnv(context)$1;'
        );
        changed = true;
    }

    if (content.match(/const serverEnv = Object\.assign\(\{.*?\}, process\.env, context\?\.cloudflare\?\.env \|\| \{\}\)/)) {
        content = content.replace(
            /const serverEnv = Object\.assign\(\{\s*\}\s*,\s*process\.env\s*,\s*context\?\.cloudflare\?\.env \|\| \{\}\)( as any)?;/g,
            'const serverEnv = getMergedServerEnv(context)$1;'
        );
        changed = true;
    }

    // Auth.ts specific fixes
    if (content.includes('const actualProcess = typeof globalThis !== \'undefined\' ? globalThis.process : undefined;')) {
        content = content.replace(
            /const actualProcess = typeof globalThis !== 'undefined' \? globalThis\.process : undefined;\s*const processValue = actualProcess\?\.env\?\.\[key\] \|\| \(typeof process !== 'undefined' \? process\.env\[key\] : undefined\);/g,
            'const processValue = getSystemEnv()[key];'
        );
        changed = true;
    }

    // Replace direct process.env reads
    if (content.match(/process\.env((?!\.NODE_ENV)[\.\[])/)) {
        // Avoid replacing process.env.NODE_ENV and process.env[envVarName] inside checks without adding imports if not needed, but wait, replacing `process.env.something` -> `getSystemEnv().something` is generally safe.
        content = content.replace(/process\.env([\.\[])/g, (match, suffix) => {
            if (content.includes('process.env.NODE_ENV') && match === '.NODE_ENV') return match;
            changed = true;
            return `getSystemEnv()${suffix}`;
        });
    }

    // Add imports if changed
    if (changed && !content.includes('getMergedServerEnv') && !content.includes('getSystemEnv')) {
        // Something changed but the functions aren't there? Wait, the replacements themselves insert it.
    }

    if (changed) {
        const importStats = [];
        if (content.includes('getMergedServerEnv')) importStats.push('getMergedServerEnv');
        if (content.includes('getSystemEnv')) importStats.push('getSystemEnv');

        if (importStats.length > 0) {
            // Check if it's already imported
            const hasImport = new RegExp(`import\\s+\\{[^}]*(?:${importStats.join('|')})[^}]*\\}\\s+from\\s+['"]~/utils/env['"]`).test(content);
            if (!hasImport) {
                content = `import { ${importStats.join(', ')} } from '~/utils/env';\n` + content;
            }
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${file}`);
    }
}
