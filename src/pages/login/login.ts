import { Component } from '@angular/core';
import { NavController, AlertController, LoadingController, Loading, IonicPage, App } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { TabsPage } from '../tabs/tabs';
import { ToastController } from 'ionic-angular';
import { CPQRestApiProvider } from '../../providers/cpq-rest-api/cpq-rest-api';


@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class Login {
  settings: any;
  user: any;
  loading: Loading;
  isLoading: boolean = false;
  registerCredentials = { username: '', password: '' };
 
  constructor(public navCtrl: NavController,
    private localDataService: LocalDataServiceProvider,
    public restApi: CPQRestApiProvider,
    private alertCtrl: AlertController, 
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private appCtrl: App) {

    //this.user = this.localDataService.getUserInfo();
    console.log(JSON.stringify(this.user));

    this.isLoading = true;
    this.localDataService.getSettings()
      .then(data => {
        this.settings = data;
        this.localDataService.attemptAutoLogin().then(data => {
          let res: any = data;
          if(res.success){
            this.navCtrl.setRoot(TabsPage);
          }
          this.isLoading = false;
        });

    });

  }
 
  public forgot() {
    let alert = this.alertCtrl.create({
      title: 'Forgot',
      subTitle: "remember password",
      buttons: ['OK']
    });
    alert.present(alert);
    //this.nav.push('ForgotPage');
  }
 
  public login() {

    this.localDataService.loginUser(this.registerCredentials).then(data => {
    
      let res: any = data;
      if(res.success){
        this.presentToast('success', res.message);
        this.navCtrl.setRoot(TabsPage);
      }
      else{
        this.presentToast('error', res.message);
      }

    })

  }
 
  showLoading() {
    this.loading = this.loadingCtrl.create({
      content: 'Please wait...',
      dismissOnPageChange: true
    });
    this.loading.present();
  }
 
  showError(text) {
    this.loading.dismiss();
 
    let alert = this.alertCtrl.create({
      title: 'Fail',
      subTitle: text,
      buttons: ['OK']
    });
    alert.present(prompt);
  }

  /**
   *
   * @param  type     {string} 'success', 'error', 'info'
   * @param  message  {string} 
   */

  presentToast(type, message) {
    if(!type){
      type = 'info';
    }

    let toast = this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'top',
      cssClass: type
    });

    toast.onDidDismiss(() => {
      console.log('Dismissed toast');
    });

    toast.present();
  }
}