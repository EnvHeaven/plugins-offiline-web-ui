// import { Directive, ElementRef, HostListener, Output, EventEmitter } from '@angular/core';

// import { Directive, ElementRef, HostListener } from "@angular/core";
import { ImageLoadingService } from "./image.service";

// @Directive({
//     selector: 'img',
//     standalone: true,
// })
// export class ImgLoadedDirective
// {
//     @Output() loaded = new EventEmitter();

//     @HostListener('load')
//     @HostListener('error')
//     imageLoaded()
//     {
//         this.loaded.emit();
//         this.loaded.complete();
//     }
// }


////////////////

// import { Directive, Output, EventEmitter, ElementRef, HostListener, OnInit } from '@angular/core';

// @Directive({
//     standalone: true,
//     selector: 'img[loaded]'
// })
// export class LoadedDirective
// {
//     @Output() loaded = new EventEmitter();

//     @HostListener('load')
//     onLoad()
//     {
//         this.loaded.emit();
//     }

//     constructor(private elRef: ElementRef<HTMLImageElement>)
//     {
//         if (this.elRef.nativeElement.complete)
//         {
//             this.loaded.emit();
//         }
//     }
// }

/////////////////////


// @Directive({
//     selector: 'img',
//     standalone: true,
// })
// export class MyImgDirective
// {
//     constructor(
//         private el: ElementRef,
//         private imageLoadingService: ImageLoadingService)
//     {
//         console.log('#> MyImgDirective | constructor');
//         // console.log('#> MyImgDirective | constructor' + el.nativeElement);
//         imageLoadingService.imageLoading(el.nativeElement);
//     }

//     @HostListener('load')
//     onLoad()
//     {
//         console.log('#> load');
//         this.imageLoadingService.imageLoadedOrError(this.el.nativeElement);
//     }

//     @HostListener('error')
//     onError()
//     {
//         console.log('#> error');
//         this.imageLoadingService.imageLoadedOrError(this.el.nativeElement);
//     }
// }

/////////////////////////////


import { isPlatformBrowser } from '@angular/common';
import
{
    AfterContentInit,
    Directive,
    ElementRef,
    HostListener,
    Inject,
    Input,
    OnInit,
    PLATFORM_ID,
    Renderer2,
} from '@angular/core';

// @Directive({
//     standalone: true,
//     selector: 'img[imageLoader]',
// })
// export class ImageLoaderDirective implements OnInit, AfterContentInit
// {
//     @Input()
//     public src!: string;
//     @Input()
//     public loaderSrc: string = '/assets/image-loading.png';
//     @Input()
//     public errorSrc: string = '/assets/image-not-found.png';
//     @Input()
//     public lazyLoad: boolean = true;

//     private alreadyTriedLoading: boolean = false;
//     private alreadyTriedError: boolean = false;

//     constructor(
//         private el: ElementRef<HTMLImageElement>,
//         private renderer: Renderer2,
//         @Inject(PLATFORM_ID) private platformId: Object
//     )
//     {
//         console.log('ImageLoaderDirective | constructor > el = ', el);
//     }

//     ngOnInit(): void
//     {
//         this.renderer.setAttribute(this.el.nativeElement, 'src', this.src);

//         if (this.lazyLoad)
//         {
//             this.renderer.setAttribute(this.el.nativeElement, 'loading', 'lazy');
//         }
//     }

//     ngAfterContentInit(): void
//     {
//         if (this.shouldDisplayLoader())
//         {
//             this.renderer.setAttribute(this.el.nativeElement, 'src', this.loaderSrc);
//         } else
//         {
//             this.renderer.setAttribute(this.el.nativeElement, 'src', this.src);
//         }
//     }

//     @HostListener('load')
//     public onLoad(): void
//     {
//         console.log("#>> load");

//         if (!this.alreadyTriedLoading)
//         {
//             this.renderer.setAttribute(this.el.nativeElement, 'src', this.src);
//         }
//         this.alreadyTriedLoading = true;
//     }

//     @HostListener('error')
//     public onError(): void
//     {
//         if (!this.alreadyTriedError)
//         {
//             this.renderer.setAttribute(this.el.nativeElement, 'src', this.errorSrc);
//         }
//         this.alreadyTriedError = true;
//     }

//     private shouldDisplayLoader(): boolean
//     {
//         return (
//             isPlatformBrowser(this.platformId) && !this.el.nativeElement.complete
//         );
//     }
// }
