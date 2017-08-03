import { Component, OnInit } from '@angular/core';
import { NavController, AlertController, LoadingController, Loading, IonicPage } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { ToastController } from 'ionic-angular';
import { CPQRestApiProvider } from '../../providers/cpq-rest-api/cpq-rest-api';

// ***** for progress bar plugin
//import {NgProgressService} from 'ngx-progressbar';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
 
})

export class HomePage {

  loading: Loading;
  public isDatabaseReady: boolean;

  public alerts: any;
  public notifications: any;
  public myRecentActivity: any;
  public myCPQDriveSummary: any;
  public settings: any;


  public hasRecentActivity = false;

  constructor(public navCtrl: NavController,
              private alertCtrl: AlertController,
              private toastCtrl: ToastController,
              public loadingCtrl: LoadingController,
              public localDataService: LocalDataServiceProvider,
              public restApi: CPQRestApiProvider
              ) {

    this.isDatabaseReady = null;

    this.restApi = restApi;
    this.settings = {
      onlineMode: true,
      autoRefresh: false
    }
    this.showLoading();

    this.localDataService.initDatabase().then(r => {

      let res: any = r;
      if(res.stubDataLoaded){
        this.loadData().then(res => {
          this.isDatabaseReady = true;
          this.loading.dismiss();

        });
      }
      else{

        this.localDataService.refreshAll().then(res => {
          this.loadData().then(res => {
            this.localDataService.setSettings({ stubDataLoaded: true });
            this.isDatabaseReady = true;
            this.loading.dismiss();

          });
        });

      }

    });
  
  }

  showLoading() {
    this.loading = this.loadingCtrl.create({
      content: 'Setting up sample data. Please wait...',
      dismissOnPageChange: false // This attribute set to true is trying to dismiss a page which no longer exits set to false error stops
    });
    this.loading.present();
  }

  loadData(){

    return new Promise(resolve => {

       // Load "My CQP Drive Summary" data
      this.localDataService.getSettings()
      .then(data => {
        this.settings = data;

        // Load "Alerts" data
        this.localDataService.getAlerts()
        .then(data => {
          this.alerts = data;
          this.alerts.selected = false;
          this.alerts.count = this.alerts.expiredCatalogOnQuote.length + this.alerts.expiredQuotes.length;
          this.alerts.pluralize = (this.alerts.count!=1)? 'S': '';
          
        });

         // Load "Notifications" data
        this.localDataService.stub_getNotifications()
        .then(data => {
          this.notifications = data;
          this.notifications.selected = false;
          this.notifications.pluralize = (this.notifications.length!=1)? 'S': '';
        });

         // Load "My Recent Activity" data
        this.localDataService.getMyRecentActivity()
        .then(data => {
          this.myRecentActivity = data;
          this.myRecentActivity.selected = false

          this.hasRecentActivity = (this.myRecentActivity && this.myRecentActivity.recentQuotes && this.myRecentActivity.recentQuotes.length>0 && this.myRecentActivity.recentQuotes[0].lastModified);
        });

         // Load "My CQP Drive Summary" data
        this.localDataService.getMyCPQDriveSummary()
        .then(data => {
          this.myCPQDriveSummary = data;
          // get percent progress, then add to view with pService
          //let progress = this.myCPQDriveSummary.storage.mbUsed / this.myCPQDriveSummary.storage.mbUsed.mbAvailable;
          //this.pService.start();
          //this.pService.set(progress);
          this.myCPQDriveSummary.pluralize = (this.myCPQDriveSummary.checkedOutQuotes!=1)? 'S': '';
        });

        resolve(true);
        
      });

    });


  }
  // Function to pass ON_OFF params to Opportunity page
  
  doCPQDriveRefresh(){

    this.localDataService.refreshAll();
    this.localDataService.doMyCPQDriveRefresh();
    this.localDataService.getMyCPQDriveSummary()
    .then(data => {
      this.myCPQDriveSummary = data;
      this.myCPQDriveSummary.storage.mbUsed = Math.round(this.myCPQDriveSummary.storage.mbUsed * 100) / 100;
      this.myCPQDriveSummary.pluralize = (this.myCPQDriveSummary.checkedOutQuotes!=1)? 'S': '';
    });

  }

  // The following functions are used to reverse wheather the apropriate
  // sections will display all provided information (as opposed to just the
  // summary). In the objects corresponding to each function, the boolean 
  // value "selected" is negated to do this
  toggleAlertsSelection(){
    this.alerts.selected = !this.alerts.selected;
    this.localDataService.getMyCPQDriveSummary()
    .then(data => {
      this.myCPQDriveSummary = data;
      this.myCPQDriveSummary.storage.mbUsed = Math.round(this.myCPQDriveSummary.storage.mbUsed * 100) / 100;
      this.myCPQDriveSummary.pluralize = (this.myCPQDriveSummary.checkedOutQuotes!=1)? 'S': '';
    });
  }

  toggleNotificationsSelection(){
     this.notifications.selected = !this.notifications.selected;
  }

  toggleMyRecentActivitySelection() {
    this.myRecentActivity.selected = !this.myRecentActivity.selected;
  }


  // Toggles if device is set to "Online Mode"
  toggleOnlineMode() {
    
    const newStatus = !(this.settings.onlineMode);
    console.log(newStatus);

    this.localDataService.setOnlineStatus({ onlineMode: newStatus});
    this.settings.onlineMode = newStatus;

  }

  // Toggles if device is set to "Auto Refresh"
  toggleAutoRefresh() {
    
    const newStatus = !this.settings.autoRefresh;
    console.log(newStatus);

    this.localDataService.setOnlineStatus({ autoRefresh: newStatus});
    this.settings.autoRefresh = newStatus;

  }

}
