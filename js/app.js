import { init } from './supabase-client.js';
import { v19Init } from './workspace.js';
import { v20Init } from './competitor-research.js';
import { v21Init } from './shop-import.js';
import { v22Init, v22PostInit } from './dashboard.js';
import { v23Init } from './guided-fixes.js';

v20Init();
v21Init();
v22Init();
v23Init();
v19Init();
v22PostInit();
init();
