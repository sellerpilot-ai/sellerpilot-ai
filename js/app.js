import {operatorView,$} from './core.js';
import {v61Init} from './beta-onboarding.js';
import {v60Init} from './shop-assistant-workspace.js';
import {v59Init} from './listing-plan-workspace.js';
import {v58Init} from './competitor-workspace.js';
import {v57Init} from './keyword-lab.js';
import { v54Init } from './subscription-workspace.js';
import { v44Init } from './stripe-portal.js?v=50';
import { v41Init } from './stripe-checkout.js?v=49';
import { v40Init } from './stripe-test.js';
import { v37Init } from './privacy-controls.js';
import { v32Init } from './beta-feedback.js';
import { v31Init } from './etsy-preview.js';
import { init } from './supabase-client.js';
import { v19Init } from './workspace.js';
import { v20Init } from './competitor-research.js';
import { v21Init } from './shop-import.js';
import { v22Init, v22PostInit } from './dashboard.js';
import { v23Init } from './guided-fixes.js';

import { v25Init } from './marketplace-focus.js';

import { v27Init } from './ai-optimiser.js';

import { v28Init } from './image-intelligence.js';

v20Init();
v21Init();
v22Init();
v23Init();
v19Init();
v58Init();
v59Init();
v60Init();
v61Init();
v22PostInit();
v25Init();
v27Init();
v28Init();
v31Init();
v32Init();
v37Init();
if(operatorView()){document.body.classList.add("v63-operator");$("v63-operator-tools").hidden=false;v40Init();v41Init();v44Init();}
v54Init();
v57Init();
await init();
