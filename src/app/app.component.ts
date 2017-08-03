import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';


import { Login } from '../pages/login/login';
import { HomePage } from '../pages/home/home';
import { DevPage } from '../pages/dev/dev';
import { LocalDataServiceProvider } from '../providers/local-data-service/local-data-service';
import { SQLite } from '@ionic-native/sqlite';
import { TabsPage } from '../pages/tabs/tabs';

@Component({
  templateUrl: 'app.html',
  providers:[LocalDataServiceProvider]
})

export class MyApp {
  rootPage:any = Login;
  //rootPage:any = TabsPage;
  //rootPage:any = DevPage;

  constructor(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen ) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();

    });
  }
}
