            import * as THREE from 'three';
            import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
            import { Water } from 'three/addons/objects/Water2.js';
			import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
			import { Octree } from 'three/addons/math/Octree.js';
            import { Capsule } from 'three/addons/math/Capsule.js';
            import Stats from 'three/addons/libs/stats.module.js';
            import { TWEEN } from 'three/addons/libs/tween.module.min.js';



            const container = document.getElementById( 'container' );

            let scene, camera, clock, renderer, water, rubberduck, playerRotateVelocity, naver, map;
            let backupinersect;
            let boundingBox;
            // let boxHelper;
            let buttoncheck;
            const intersectBox= [];
            const searchdirection = new THREE.Vector3(0,0,-1);

            const loadingManager = new THREE.LoadingManager();

            loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
            // 로딩이 시작될 때 호출되는 콜백 함수
            document.getElementById('loading').style.display = 'block';
            };

            loadingManager.onLoad = function () {
            // 로딩이 완료될 때 호출되는 콜백 함수
            document.getElementById('loading').style.display = 'none';
            };

            loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
            // 로딩 진행 상황을 추적하여 화면에 표시하는 로직을 구현합니다.
            console.log('Loaded ' + itemsLoaded + '/' + itemsTotal + ' files.');
            // 로딩 상태를 나타내는 로딩 바 업데이트
            const progressBar = document.getElementById('loading-bar');            
            const progressText = document.getElementById('load-percent');

            const percent = (itemsLoaded / itemsTotal) * 100;

            progressBar.style.width = percent + '%';
            progressText.innerHTML = percent.toFixed(0) + "%";

            };

            const stats = new Stats();
            stats.domElement.style.position = 'absolute';
			stats.domElement.style.top = '0px';
            container.appendChild( stats.domElement );
        
            const textureLoader = new THREE.TextureLoader();
            const gltfloader = new GLTFLoader(loadingManager);
			const worldOctree = new Octree();
            const STEPS_PER_FRAME = 5;
            const keyStates = {};
            const playerCollider = new Capsule( new THREE.Vector3( 0, 0.57, 0 ), new THREE.Vector3( 0, 1.3, 0 ), 1 );
			const playerDirection = new THREE.Vector3();
            const playerVelocity = new THREE.Vector3();
            const headDirection = new THREE.Vector3(-1, 0, 0);
            const playerQuaternion = new THREE.Quaternion(); // 초기 쿼터니언
            const axis = new THREE.Vector3(0, 1, 0);
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const buoyancy = new THREE.Vector3(0 ,0.005, 0);

            document.addEventListener('keydown', function(event) {
                console.log(event.code);
                let code = event.code;
                keyStates[code] = true;
              });
              
              document.addEventListener('keyup', function(event) {
                let code = event.code;
                keyStates[code] = false;
                if (code === 'Space' || code === 32) {
                  buttoncheck = 0;
                }
              });       
            // key('a', function(){ keyStates[ "KeyA"] = true; });
            // key('w', function(){ keyStates[ "KeyW"] = true; });
            // key('s', function(){ keyStates[ "KeyS"] = true; });
            // key('d', function(){ keyStates[ "KeyD"] = true; });
            // key('space', function(){ keyStates[ "Space"] = true; });



			const params = {
				color: '#ffffff',
				scale: 2,
				flowX: 1,
				flowY: 1,
                alpha: 0.2
			};
            init();



			function init() {
 
				// scene

				scene = new THREE.Scene();
                // scene.fog = new THREE.Fog( 0x88ccee, 0, 100 );

                	// camera

				camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 200 );
				camera.position.set( -10, 4,10 );
				camera.lookAt( scene.position );
                playerDirection.set(-1,0,0);
                


				// clock

				clock = new THREE.Clock();
				
                // renderer

				renderer = new THREE.WebGLRenderer( { antialias: true } );
				renderer.setSize( window.innerWidth, window.innerHeight );
				renderer.setPixelRatio( window.devicePixelRatio );
				document.body.appendChild( renderer.domElement );

                // water

				const waterGeometry = new THREE.PlaneGeometry( 50, 30 );
                const waternomalmap0 = new THREE.TextureLoader().load('./examples/textures/water/Water_1_M_Normal.jpg');
                const waternomalmap1 = new THREE.TextureLoader().load('./examples/textures/water/Water_2_M_Normal.jpg');
                water = new Water( waterGeometry, {
                    color: params.color,
                    scale: params.scale,
                    flowDirection: new THREE.Vector2( params.flowX, params.flowY ),
                    normalMap0: waternomalmap0,
                    normalMap1: waternomalmap1,
                    textureWidth: 1024,
                    textureHeight: 1024,
                    flowSpeed: 0.005
                } );
                water.position.y = 1;
                water.rotation.x = Math.PI * - 0.5;
                scene.add( water );
                

                //rubberduck


                gltfloader.load( './3dmodel/rubberduckmodel.glb', function( gltf ){
                    gltf.scene.position.set(0, 0.57, 0);
                    rubberduck = gltf.scene;
                    boundingBox = new THREE.Box3().setFromObject(rubberduck);
                    const size = boundingBox.getSize(new THREE.Vector3());
                    boundingBox.setFromCenterAndSize(boundingBox.getCenter(new THREE.Vector3()), size.multiplyScalar(1.5));
                    // boxHelper = new THREE.Box3Helper(boundingBox, 0xffff00);
                    // console.log(rubberduck);
                    // scene.add(boxHelper);
                    scene.add(rubberduck );

                    }, undefined, function ( error ) {
                        console.error( error );
                }); 

                
                //naver
                gltfloader.load( './3dmodel/naver.glb', function( gltf ){
                    gltf.scene.position.set(2, 1.5, 1);
                    worldOctree.fromGraphNode( gltf.scene );
                    gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.userData = {
                            link: 'https://www.naver.com'
                        };
                    child.name = 'naver'; // 이름 설정

                    // child.userData.link = 'lubixcube.html';
                    }});                    
                    naver = gltf.scene;
                    intersectBox.push(naver);

                    
                    // console.log( navera );
                    scene.add( naver );

                    }, undefined, function ( error ) {
                        console.error( error );
                });


	            // skybox

                // const cubeTextureLoader = new THREE.CubeTextureLoader();
				// cubeTextureLoader.setPath( '../examples/textures/cube/skybox/' );

				// const cubeTexture = cubeTextureLoader.load( [
				// 	'right.jpg', 'left.jpg',
				// 	'top.jpg', 'bottom.jpg',
				// 	'front.jpg', 'back.jpg'
				// ] );
				// scene.background = cubeTexture;
                scene.background = new THREE.Color( 0x88ccee );


				// light

				const ambientLight = new THREE.AmbientLight( 0xeeeeee, 0.8 );
				scene.add( ambientLight );

				const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
				directionalLight.position.set( -10, 10, 10 );
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 1024;
                directionalLight.shadow.mapSize.height = 1024;
                directionalLight.shadow.radius = 9;
                directionalLight.shadow.bias = - 0.00006;
				scene.add( directionalLight );


				// gui
				// const gui = new GUI();

				// gui.addColor( params, 'color' ).onChange( function ( value ) {

				// 	water.material.uniforms[ 'color' ].value.set( value );

				// } );
				// gui.add( params, 'scale', 1, 10 ).onChange( function ( value ) {

				// 	water.material.uniforms[ 'config' ].value.w = value;

				// } );
				// gui.add( params, 'flowX', - 1, 1 ).step( 0.01 ).onChange( function ( value ) {

				// 	water.material.uniforms[ 'flowDirection' ].value.x = value;
				// 	water.material.uniforms[ 'flowDirection' ].value.normalize();

				// } );
				// gui.add( params, 'flowY', - 1, 1 ).step( 0.01 ).onChange( function ( value ) {

				// 	water.material.uniforms[ 'flowDirection' ].value.y = value;
				// 	water.material.uniforms[ 'flowDirection' ].value.normalize();

				// } );

				// gui.open();

				//

				const controls = new OrbitControls( camera, renderer.domElement );
                controls.minDistance = 5;
				controls.maxDistance = 50;

				//

				window.addEventListener( 'resize', onWindowResize );
                window.addEventListener( 'mousemove', onMouseMove, false );
                window.addEventListener( 'click', onClick, false );
                //map
                gltfloader.load( './3dmodel/Poolbox.glb', function( gltf ){
                    gltf.scene.position.set(0, 0, 0);
                    worldOctree.fromGraphNode( gltf.scene);}, 
                    undefined, function ( error ) {
                        console.error( error );
                });

                

                gltfloader.load( './3dmodel/Pool.glb', function( gltf ){
                    gltf.scene.position.set(0, 0, 0);
                    gltf.scene.traverse((child) => {
                    child.name = 'map'; // 이름 설정
                    });                
                    map = gltf.scene;
                    // // console.log( navera );
                    scene.add( map );
                    animate();

                    }, undefined, function ( error ) {
                        console.error( error );
                });
        }
            
            function onMouseMove( event ) {
                // 마우스 위치 감지
                mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
                mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

                raycaster.setFromCamera( mouse, camera );
                const intersects = raycaster.intersectObjects( scene.children, true );
                // 검색된 객체에 대해 하이라이트 스케일 처리
                // if ( intersects.length > 0 ) {
                //     // console.log(intersects);

                //     const targetObject = intersects.find(intersect => intersect.object.name === 'naver');
                //     if (targetObject) {
                //         backupinersect =targetObject;
                //         targetObject.object.material.emissive.setHex( 0x555555 );
                //         console.log(targetObject.object);
                //         const tween = new TWEEN.Tween(targetObject.object.scale)
                //             .to({ x: 1.8, y: 1.8, z: 1.8 }, 500)
                //             .easing(TWEEN.Easing.Quadratic.InOut)
                //             .start();
                //     }
                //     else{
                //         if(backupinersect)
                //         {
                //             const tween = new TWEEN.Tween(backupinersect.object.scale)
                //             .to({ x: 1, y: 1, z: 1 }, 500)
                //             .easing(TWEEN.Easing.Quadratic.InOut)
                //             .start()
                //             backupinersect.object.material.emissive.setHex( 0x000000 );
                //             backupinersect = undefined;
                //         }
                //     }
                // }
                
            }
            

            function onClick( event ) {
                raycaster.setFromCamera( mouse, camera );
                let intersects = raycaster.intersectObjects( scene.children );

                if ( intersects.length > 0 ) {
                    // 3. href 값 가져오기
                    const targetObject = intersects.find(intersect => intersect.object.name === 'naver');
                    // console.log(targetObject);

                    if (targetObject) {
                        // console.log(targetObject.object.userData);

                    let link = targetObject.object.userData.link;
                    console.log(link);
                    // 4. 새로운 페이지로 이동
                    window.open( link );
                }
                }
            }

            function onWindowResize() {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize( window.innerWidth, window.innerHeight );
            }
            
            function playerCollisions() {

                const result = worldOctree.capsuleIntersect( playerCollider );
                //boom
                if ( result ) {
                    const deltaPosition = result.normal.multiplyScalar( result.depth );
                    playerCollider.translate( deltaPosition );
                    // console.log(result.depth);
                    camera.position.x += deltaPosition.x;
                    camera.position.z += deltaPosition.z;
                    // console.log(playerCollider);
                }

            }

			function getSideVector( angle ) {
            playerDirection.copy(headDirection);
            // console.log(headDirection);
            playerDirection.applyAxisAngle(axis, angle);
            playerDirection.normalize();
            // console.log(playerDirection);
            return playerDirection;
            }
            function getForwardVector() {

            // camera.getWorldDirection( playerDirection );
            playerDirection.copy(headDirection);
            // console.log(headDirection);
            playerDirection.y = 0;
            playerDirection.normalize();

            return playerDirection;

            }

            function updatePlayer( deltaTime ) {

                let damping = Math.exp( - 4 * deltaTime ) - 1;
                
                playerVelocity.addScaledVector( playerVelocity, damping );
                const deltaPosition = playerVelocity.clone().multiplyScalar( deltaTime );
                // console.log(damping);
                // console.log(deltaPosition);
                playerCollider.translate( deltaPosition );
                // console.log("position",deltaPosition);

                if (rubberduck){
                    playerCollisions();

                    if(playerRotateVelocity)
                    {
                        playerRotateVelocity += (playerRotateVelocity * damping);
                        // console.log(playerRotateVelocity);
                        const deltaRotate = playerRotateVelocity * deltaTime ;
                        headDirection.applyAxisAngle( axis,deltaRotate );
                        rubberduck.rotation.y += deltaRotate;
                    }
                    // console.log(playerCollider);
                    if(playerCollider.start.y < 0.57)
                    {
                        const deltabuoyancy = buoyancy.clone().multiplyScalar(0.57 - playerCollider.start.y);
                        // console.log(deltabuoyancy);
                        playerCollider.translate(deltabuoyancy);
                        // console.log(playerCollider);
                    }
                    rubberduck.position.copy( playerCollider.start );
                    camera.lookAt(rubberduck.position);
                    // camera.position.x += deltaPosition.x;
                    // camera.position.z += deltaPosition.z;
                }
            }

            function updateBoudingBox() {
                if(rubberduck){
                boundingBox.setFromObject(rubberduck);
                const size = boundingBox.getSize(new THREE.Vector3());
                boundingBox.setFromCenterAndSize(boundingBox.getCenter(new THREE.Vector3()), size.multiplyScalar(2.5));
                // boxHelper.box = boundingBox;
                // boxHelper.position.copy(rubberduck.position);
                // console.log(boundingBox);

                for (let i = 0; i < intersectBox.length; i++) {
                const objectBoundingBox = new THREE.Box3().setFromObject(intersectBox[i]);
                if (boundingBox.intersectsBox(objectBoundingBox)) {
                    // console.log(intersectBox[i]);
                    if(intersectBox[i].flag !== 2)
                        intersectBox[i].flag = 1;
                    // 충돌했을 때 수행할 로직 작성
                }
                else{
                    intersectBox[i].flag = 0;
                }
                }}
            }

            function controls( deltaTime ) {

            // gives a bit of air control
            const speedDelta = deltaTime * 20;

            if ( keyStates[ 'KeyW' ] ) {
                playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );

            }
            if ( keyStates[ 'KeyS' ] ) {

                playerVelocity.add( getForwardVector().multiplyScalar( - speedDelta ) );

            }
            if ( keyStates[ 'KeyA' ] ) {
                playerRotateVelocity = Math.PI * 10 *speedDelta;
            }

            if ( keyStates[ 'KeyD' ] ) {

                playerRotateVelocity = -Math.PI * 10 *speedDelta;
            }
            if ( keyStates[ 'Space' ] && buttoncheck == 0) {
                    for(let i = 0; i < intersectBox.length; i++){
                        if (intersectBox[i].flag > 0){
                            let link = intersectBox[i].children[0].userData.link;
                            console.log(link);
                            // 4. 새로운 페이지로 이동
                            window.open( link );
                            buttoncheck = 1;
                        }
                    }

            }

            }

            function active() {
                for (let i = 0; i < intersectBox.length; i++) {
                if (intersectBox[i].flag === 1) {
                    const targetObject = intersectBox[i].children[0];
                    backupinersect = targetObject;
                    targetObject.material.emissive.setHex( 0x363636 );
                    // console.log(targetObject);
                    const tween = new TWEEN.Tween(targetObject.scale)
                            .to({ x: 1.8, y: 1.8 , z: 1.8 }, 300)
                            .easing(TWEEN.Easing.Quadratic.InOut)
                            .start();

                    intersectBox[i].flag = 2;
                    // console.log(targetObject);
                    // console.log(scene.children);    
                    // 충돌했을 때 수행할 로직 작성
                }
                else if(intersectBox[i].flag == 0){
                    if(backupinersect)
                        {
                            // console.log("dsd")
                            const tween = new TWEEN.Tween(backupinersect.scale)
                                .to({ x: 1, y: 1, z: 1 }, 300)
                                .easing(TWEEN.Easing.Quadratic.InOut)
                                .start()
                            backupinersect.material.emissive.setHex( 0x000000 );
                            backupinersect = undefined;   
                }

            }}}


            function animate() {

                const deltaTime = Math.min( 0.05, clock.getDelta() ) / STEPS_PER_FRAME;

			// 	// we look for collisions in substeps to mitigate the risk of
			// 	// an object traversing another too quickly for detection.

    		    for ( let i = 0; i < STEPS_PER_FRAME; i ++ ) {
                    // console.log("time :",deltaTime);
                    controls( deltaTime );

                    updatePlayer( deltaTime );
                    
                    updateBoudingBox ();

                    active(); 
                    TWEEN.update();

                }
                render();

                stats.update();

                setTimeout(() => {
                    requestAnimationFrame(animate);
                }, 0);
                // console.log("check!!!");

                // console.log("check!");

            }

            function render() {

                // const delta = clock.getDelta();

                renderer.render( scene, camera );

            };
