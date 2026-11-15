import React from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from '@tanstack/react-router';
import {getRouter} from './router';
import {bootstrap} from './stores/bootstrap';
import {onSessionExpired} from './lib/api';
import {useAuthStore} from './stores/authStore';
import './styles.css';

const root=document.getElementById('root');
if(root){
 const router=getRouter();
 // Le backend renvoie 401 quand le cookie a expiré ou que le compte a été
 // suspendu : on efface la session et on ramène l'utilisateur à la connexion.
 onSessionExpired(()=>{
  if(!useAuthStore.getState().user)return;
  useAuthStore.getState().clearSession();
  void router.navigate({to:'/connexion'});
 });
 // La session et les données sont demandées avant le premier rendu : les écrans
 // n'ont jamais à deviner si le chargement est terminé.
 void bootstrap().finally(()=>createRoot(root).render(<React.StrictMode><RouterProvider router={router}/></React.StrictMode>));
}
