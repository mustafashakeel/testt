import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';

import { Login } from '../pages/login/login';

import { HomePage } from '../pages/home/home';
import { TabsPage } from '../pages/tabs/tabs';
import { MorePage } from '../pages/more/more';
import { DevPage } from '../pages/dev/dev';

import { Briefcase } from '../pages/briefcase/briefcase';
import { SelectQuote } from '../pages/quote/select-quote';
import { QuoteFilter } from '../pages/quote/quote-filter';
import { QuoteDetails } from '../pages/quote/quote-details';
import { ProductSummary } from '../pages/quote/product-summary';

import { SelectOpportunity } from '../pages/opportunity/select-opportunity';
import { OpportunityDetails } from '../pages/opportunity/opportunity-details';
import { PopoverComponent } from '../components/popover.component';
import { OpportunityFilter } from '../pages/opportunity/opportunity-filter';

import { SelectAccountPage } from '../pages/more/select-account/select-account';
import { AccountSummaryPage } from '../pages/more/account-summary/account-summary';
import { SelectCatalogPage } from '../pages/more/select-catalog/select-catalog';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { LocalDataServiceProvider } from '../providers/local-data-service/local-data-service';
import { DBAdaptorProvider } from '../providers/db-adaptor/db-adaptor';
import { CPQRestApiProvider } from '../providers/cpq-rest-api/cpq-rest-api';
import { HttpModule } from '@angular/http';

import { StatusbarComponent} from "../components/statusbar.component";
import { Filter} from "../components/filter.component";

import { SQLite } from '@ionic-native/sqlite';
import { IonicStorageModule } from '@ionic/storage';
import { AddProduct } from "../pages/quote/add-product";
import { DescriptionPopover } from "../pages/quote/description-popover";
import { Device } from '@ionic-native/device';

@NgModule({
  declarations: [
    MyApp,
    Login,
    HomePage,
    TabsPage,
    MorePage,
    SelectAccountPage,
    AccountSummaryPage,
    SelectCatalogPage,
    Briefcase,
    DevPage,
    SelectQuote,
    QuoteFilter,
    QuoteDetails,
    SelectOpportunity,
    OpportunityDetails,
    OpportunityFilter,
    ProductSummary,
    PopoverComponent,
    StatusbarComponent, 
    Filter,
    AddProduct,
    DescriptionPopover
  ],
  imports: [
    BrowserModule,
    HttpModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot({
      name: '__fpxdb',
         driverOrder: ['indexeddb', 'sqlite', 'websql']
    })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    Login,
    HomePage,
    TabsPage,
    MorePage,
    SelectAccountPage,
    AccountSummaryPage,
    SelectCatalogPage,
    DevPage,
    Briefcase,
    SelectQuote,
    QuoteFilter,
    QuoteDetails,
    SelectOpportunity,
    OpportunityFilter,
    OpportunityDetails,
    ProductSummary,
    PopoverComponent,
    StatusbarComponent,
    Filter,
    AddProduct,
    DescriptionPopover
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    LocalDataServiceProvider,
    DBAdaptorProvider,
    CPQRestApiProvider,
    SQLite,
    Device
  ]
})
export class AppModule {}
