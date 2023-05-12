            import * as THREE from 'three';
            import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
            import { Water } from 'three/addons/objects/Water2.js';
			import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
			import { Octree } from 'three/addons/math/Octree.js';
            import { Capsule } from 'three/addons/math/Capsule.js';
            import Stats from 'three/addons/libs/stats.module.js';
            import { TWEEN } from 'three/addons/libs/tween.module.min.js';
            import { Audio, AudioLoader } from 'three';
            import { WeatherAPI } from './weather.js';



            const container = document.getElementById( 'container' );
            //mobile_controller
            const controller = document.getElementById('controller');
            const arrow = document.getElementById('arrow');

            let isTouching = false;
            let touchStart = { x: 0, y: 0 };

            let scene, camera, clock, renderer, water, rubberduck, playerRotateVelocity, naver, map, tv;
            let backupinersect;
            let boundingBox;
            // let boxHelper;
            let buttoncheck;
            const intersectBox= [];
            // const searchdirection = new THREE.Vector3(0,0,-1);

            const loadingManager = new THREE.LoadingManager();

            loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
            // 로딩이 시작될 때 호출되는 콜백 함수
            document.getElementById('loading').style.display = 'block';
            };

            loadingManager.onLoad = function () {
            // 로딩이 완료될 때 호출되는 콜백 함수
            document.getElementById('loading').style.display = 'none';
            camerazoom();
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
            stats.maxFps = 120;
            stats.domElement.style.position = 'absolute';
			stats.domElement.style.top = '0px';
            container.appendChild( stats.domElement );
        
            const textureLoader = new THREE.TextureLoader();
            const gltfloader = new GLTFLoader(loadingManager);

            const audioLoader = new THREE.AudioLoader();
            const listener = new THREE.AudioListener();
            const music = new Audio(listener);
            const effect = new Audio(listener);



			const worldOctree = new Octree();
            const STEPS_PER_FRAME = 5;
            const keyStates = {};
            const playerCollider = new Capsule( new THREE.Vector3( 0, 0.57, 0 ), new THREE.Vector3( 0, 1.3, 0 ), 1 );
			const playerDirection = new THREE.Vector3();
            const playerVelocity = new THREE.Vector3();
            const headDirection = new THREE.Vector3(-1, 0, 0);
            const axis = new THREE.Vector3(0, 1, 0);
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const buoyancy = new THREE.Vector3(0 ,0.005, 0);
            //날씨
            const weatherAPI = new WeatherAPI("HqBrGQAZCs7F7Ho61Lri4K4z%2Bk1rXJfsXL6YGpw5lQjfSgYO6cl%2FIZze%2FSu9WT80mWfaKvwEbfeKFZT5UbytKw%3D%3D");
            weatherAPI.getWeatherData();



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
            // key('a', function(){ keyStates[ "KeyA"] = true; camm});
            // key('w', function(){ keyStates[ "KeyW"] = true; });
            // key('s', function(){ keyStates[ "KeyS"] = true; });
            // key('d', function(){ keyStates[ "KeyD"] = true; });
            // key('space', function(){ keyStates[ "Space"] = true; });
            //컨트롤러 설정
            function getPointInCircle(center, radius, angle) {
                const x = center.x + radius * Math.cos(angle);
                const y = center.y + radius * Math.sin(angle);
                return { x, y };
            };

            function getCameraDirectionVector(camera) {
                // 카메라의 월드 좌표 얻기
                const cameraPosition = camera.position.clone();
                // console.log("camera position",camera.position);
              
                // 카메라가 바라보는 지점의 월드 좌표 얻기
                const cameraTarget = rubberduck.position.clone();
                // cameraTarget.setFromMatrixPosition(camera.matrixWorldInverse);
                // console.log("camera target",cameraTarget);

                // 방향 벡터 구하기
                const directionVector = new THREE.Vector3();
                directionVector.subVectors(cameraTarget, cameraPosition);
                directionVector.y = 0;
                // 정규화하여 단위 벡터로 만들기
                directionVector.normalize();
              
                return directionVector;
              };

            controller.addEventListener('touchstart', (event) => {
                isTouching = true;
                // touchStart.x = event.touches[0].clientX;
                // touchStart.y = event.touches[0].clientY;
                const rect = controller.getBoundingClientRect();
                touchStart.x = rect.left + rect.width / 2;
                touchStart.y = rect.top + rect.height / 2;
                screenweather();
            });
            
            controller.addEventListener('touchmove', (event) => {
                if (!isTouching) return;
                event.preventDefault();
                const touchCurrent = {
                    // x : event.clientX,
                    // y : event.clientY,
    
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY,
                };
                
                const deltaX = touchCurrent.x - touchStart.x;
                const deltaY = touchCurrent.y - touchStart.y;
                
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const radius = controller.clientWidth / 2;
                const angle = Math.atan2(deltaY, deltaX);
            
                if (distance > radius) {
                    const { x, y } = getPointInCircle({ x: 0, y: 0 }, radius, angle);
                    arrow.style.transform = `translate(${x}px, ${y}px)`;
                } else {
                    arrow.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                }
                // playerDirection.x = deltaX;
                // playerDirection.z = deltaY;

                rubberduck.userData.dest_x =  deltaX;
                rubberduck.userData.dest_z = deltaY;
                // const deltax =  rubberduck.userData.dest_x - rubberduck.position.x;
                // const deltaz =  rubberduck.userData.dest_z - rubberduck.position.z;
                rubberduck.userData.mobile_move = 1;
                // rubberduck.userData.dest_pos = new THREE.Vector3(x, 1, z);
               

                const dest_normaldir = new THREE.Vector3(deltaX, 0, deltaY).normalize();
                rubberduck.userData.dest_dir = dest_normaldir;
                // console.log("x : ", x);
                // console.log("z : ", z);
                // console.log("rubberdeuc : ", rubberduck.position);
                    // console.log("direction : ", playerDirection);
                        // console.log("destdirection : ", rubberduck.userData.dest_dir);

                // playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );

                // 여기서 deltaX와 deltaY를 사용해 Three.js 카메라 또는 오브젝트를 조종하세요.
            });

            controller.addEventListener('touchend', () => {
                isTouching = false;
                arrow.style.transform = 'translate(0px, 0px)';
                rubberduck.userData.mobile_move = 0;
            });
            //gui 구조체
			const params = {
				color: '#ffffff',
				scale: 2,
				flowX: 1,
				flowY: 1,
                alpha: 0.2
			};
            init();

            function camerazoom() {
                const tween = new TWEEN.Tween(camera.position)
                            .to({ x: -4, y: 6, z: 12 }, 2000)
                            .easing(TWEEN.Easing.Quadratic.InOut)
                            .start();
                
            }

            

            function isMobile() {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            };

			function init() {
 
				// scene

				scene = new THREE.Scene();
                // scene.fog = new THREE.Fog( 0x88ccee, 0, 100 );

                	// camera

				camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 200 );
				camera.position.set( -12, 18, 36 );
				camera.lookAt( scene.position );
                playerDirection.set(-1,0,0);
                
                //ambiencesound
                camera.add(listener);

                const musicLoader = new AudioLoader();
                musicLoader.load('./audio/forest_ambience.mp3', function(buffer) {
                    music.setBuffer(buffer);
                    music.setLoop(true);
                    music.setVolume(0.05);
                });

                const effectLoader = new AudioLoader();
                musicLoader.load('./audio/rubberduckeffect.wav', function(buffer) {
                    effect.setBuffer(buffer);
                    effect.setVolume(0.05);
                });


				// clock

				clock = new THREE.Clock();
				
                // renderer

				renderer = new THREE.WebGLRenderer( { antialias: true } );
				renderer.setSize( window.innerWidth, window.innerHeight );
				renderer.setPixelRatio( window.devicePixelRatio );
				document.body.appendChild( renderer.domElement );

                // water

				const waterGeometry = new THREE.PlaneGeometry( 40, 30 );
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
                water.position.z = 5;
                water.position.x = -10;
                water.rotation.x = Math.PI * - 0.5;
                scene.add( water );
                

                //rubberduck


                gltfloader.load( './3dmodel/rubberduckmodel.glb', function( gltf ){
                    gltf.scene.position.set(0, 0.57, 0);
                    gltf.scene.traverse((child) => {
                        if (child.isMesh) {
                            child.userData = {
                                mobile_move: 0
                            };
                        child.name = 'rubberduck'; // 이름 설정
    
                        // child.userData.link = 'lubixcube.html';
                        }});
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
                    gltf.scene.position.set(-10, 1.5, 5);
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

				const directionalLight = new THREE.DirectionalLight( 0x888888, 1.0 );
				directionalLight.position.set( -10, 20, 10 );
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

				//event
                const musicBtn = document.getElementById('music-btn');
                musicBtn.addEventListener('click', function() {
                    if (music.isPlaying) {
                        music.pause();
                    } else {
                        music.play();
                    }
                });
				window.addEventListener( 'resize', onWindowResize );
                window.addEventListener( 'mousemove', onMouseMove, false );
                window.addEventListener( 'click', onClick, false );
               
                //tv                
                gltfloader.load( './3dmodel/tv.glb', function( gltf ){
                gltf.scene.position.set(3, 2.1, -15);
                tv = gltf.scene;
                let texture = canvastext("Welcome~^^", 10, 150, 80);
                screenupdate(texture);
                scene.add(tv);}, 
                undefined, function ( error ) {
                    console.error( error );
                });

                //mapbox
                // gltfloader.load( './3dmodel/Poolbox.glb', function( gltf ){
                //     gltf.scene.position.set(0, 0, 0);
                //     worldOctree.fromGraphNode( gltf.scene);}, 
                //     undefined, function ( error ) {
                //         console.error( error );
                // });

                
                //map
                gltfloader.load( './3dmodel/roundpool.glb', function( gltf ){
                    gltf.scene.position.set(0, 0.5, 0);
                    worldOctree.fromGraphNode( gltf.scene); 
                    gltf.scene.traverse((child) => {
                    child.name = 'map'; // 이름 설정
                    });                
                    map = gltf.scene;
                    // // console.log( navera );
                    scene.add( map );
                    music.play();
                    if (isMobile()) {
                        controller.style.display = 'flex';
                    } else {
                        controller.style.display = 'none';
                    }
                    animate();

                    }, undefined, function ( error ) {
                        console.error( error );
                });
        }
        function screenupdate(texture)
        {
            // 텍스처를 사용하는 메쉬 생성
            const tvscreen = tv.children[0].children[0].children[0].children[0].children[0];
            tvscreen.material = new THREE.MeshBasicMaterial({ map: texture });
        }

        function canvastext(text, wid, hei, px){
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const width = 500;
            const height = 250;

            // 캔버스 크기 설정
            canvas.width = width;
            canvas.height = height;

            // 텍스처 이미지 그리기
            // context.fillStyle = 'red';
            // context.fillRect(0, 0, width, height);

            context.fillStyle = 'white';
            context.font = `bold ${px}px Arial`; // 텍스트의 폰트 설정
            context.fillText(text, wid, hei); // 텍스트 그리기


            // Three.js 텍스처 생성
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;

            return(texture);
        };
            
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
                    // else{
                    //     if(backupinersect)
                    //     {
                    //         const tween = new TWEEN.Tween(backupinersect.object.scale)
                    //         .to({ x: 1, y: 1, z: 1 }, 500)
                    //         .easing(TWEEN.Easing.Quadratic.InOut)
                    //         .start()
                    //         backupinersect.object.material.emissive.setHex( 0x000000 );
                    //         backupinersect = undefined;
                    //     }
                    // }
                // }
                
            }
            
            function screenweather(){
                const canvas = document.createElement('canvas');
                const width = 500; // 캔버스의 가로 크기
                const height = 250; // 캔버스의 세로 크기
                canvas.width = width;
                canvas.height = height;

                // 캔버스 컨텍스트 가져오기
                const context = canvas.getContext('2d');



                console.log(weatherAPI.rain);
                console.log(weatherAPI.rain_state);
                console.log(weatherAPI.tmp);
                console.log(weatherAPI.sky);
                const tex1 = canvastext(weatherAPI.tmp + "℃", 100, 150, 100);
                context.drawImage(tex1.source.data, 250, 20, 300, 150);
                const tex2 = canvastext("☔︎ " + weatherAPI.rain + "%", 100, 150, 50);
                context.drawImage(tex2.source.data, 250, 60, 300, 150);
                textureLoader.load('./weather/sun.png', function(texture) {
                    // 텍스처 로딩이 완료된 후에 실행될 콜백 함수
                    context.drawImage(texture.source.data, 70, 50, 150, 150);
                    const combinedTexture = new THREE.CanvasTexture(canvas);
                    screenupdate(combinedTexture);
                  });            
            }

            function onClick( event ) {
                // const flontaxis = new THREE.Vector3(0,0,-1);
                // const camera_normaldir = getCameraDirectionVector(camera);
                // let cameraangle = flontaxis.angleTo(camera_normaldir);
                // const camera_cross = new THREE.Vector3().crossVectors(flontaxis, camera_normaldir);
                // if (camera_cross.y < 0)
                //     cameraangle *= -1;
                // const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, cameraangle);
                // const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
                // const dir = new THREE.Vector3(0.5,0,0.5).applyMatrix4(rotationMatrix);
                // console.log("camera : ", camera_normaldir);
                // console.log("dir",dir);
                // console.log("head", headDirection);
                // console.log("position : ", rubberduck.position);
                // console.log("mobile_dest_dir : ", rubberduck.userData.dest_dir);

                screenweather();



                raycaster.setFromCamera( mouse, camera );
                let intersects = raycaster.intersectObjects( scene.children );
                if ( intersects.length > 0 ) {
                    // 3. href 값 가져오기
                    const targetObject = intersects.find(intersect => intersect.object.name === 'naver');
                    const waterObject = intersects.find(intersect => intersect.object.type === 'Water');

                    // console.log(intersects[0].point);
                    // console.log(intersects);


                    if (targetObject) {
                        // console.log(targetObject.object.userData);

                    let link = targetObject.object.userData.link;
                    console.log(link);
                    // 4. 새로운 페이지로 이동
                    window.open( link );
                    }
                    // else if (waterObject)
                    // {
                    //     let x = waterObject.point.x;
                    //     let z = waterObject.point.z;
                    //     rubberduck.userData.dest_x =  x;
                    //     rubberduck.userData.dest_z = z;
                    //     const deltax =  rubberduck.userData.dest_x - rubberduck.position.x;
                    //     const deltaz =  rubberduck.userData.dest_z - rubberduck.position.z;
                    //     rubberduck.userData.click_Distance = Math.sqrt((deltax * deltax) + (deltaz * deltaz));
                    //     rubberduck.userData.mobile_move = 1;
                    //     // rubberduck.userData.dest_pos = new THREE.Vector3(x, 1, z);
                    //     rubberduck.userData.dest_dir = new THREE.Vector3(deltax, 0, deltaz);
                    //     // console.log("x : ", x);
                    //     // console.log("z : ", z);
                    //     // console.log("rubberdeuc : ", rubberduck.position);
                    //     // console.log("direction : ", playerDirection);
                    //     // console.log("destdirection : ", rubberduck.userData.dest_dir);





                    // }
                
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
                    const normalVelocity = result.normal.clone().multiplyScalar(playerVelocity.dot(result.normal));
                    const friction = -1.5;
                    normalVelocity.multiplyScalar(friction);
                    playerVelocity.sub(normalVelocity).negate();

                    // playerVelocity.reflect( result.normal );//.multiplyScalar( 1.7 );
                    // console.log(playerVelocity);
                   // const deltaPosition = result.normal.multiplyScalar( result.depth );
                    // playerCollider.translate( deltaPosition );
                    effect.play();

                    // console.log(result.depth);
                    // camera.position.x += deltaPosition.x;
                    // camera.position.z += deltaPosition.z;
                    // console.log(playerCollider);
                }

            }

			// function getSideVector( angle ) {
            // playerDirection.copy(headDirection);
            // // console.log(headDirection);
            // playerDirection.applyAxisAngle(axis, angle);
            // playerDirection.normalize();
            // // console.log(playerDirection);
            // return playerDirection;
            // }
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
                        // console.log("RV: ",playerRotateVelocity);
                        const deltaRotate = playerRotateVelocity * deltaTime ;
                        // console.log(deltaRotate);
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
                    rubberduck.userData.click_Distance -= Math.sqrt((deltaPosition.x * deltaPosition.x) + (deltaPosition.z * deltaPosition.z));
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
                const speedDelta = deltaTime * 10;

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
                                // 4. 새cd 로운 페이지로 이동
                                window.open( link );
                                buttoncheck = 1;
                            }
                        }

                }
            }

            function mobile_move( deltatime )
            {
                if (rubberduck.userData.mobile_move >= 1)
                {

                    
                    // const deltax =  rubberduck.userData.dest_x - rubberduck.position.x;
                    // const deltaz =  rubberduck.userData.dest_z - rubberduck.position.z;
                    // console.log("deltax : ",deltax);
                    // console.log("deltaz : ", deltaz);

                    const speedDelta = deltatime * 10;
                    const angle = headDirection.angleTo(rubberduck.userData.dest_dir); 
 

                   
                    if (angle >= 0.01 && rubberduck.userData.mobile_move == 1)
                    {
                        playerVelocity.multiplyScalar(0);
                        // console.log("angle : ", angle);
                        // console.log("head : ", headDirection);
                        const cross = new THREE.Vector3().crossVectors(headDirection, rubberduck.userData.dest_dir);
                        const isClockwise = (cross.y > 0);
                        if (isClockwise)
                            playerRotateVelocity = Math.PI * 10 * speedDelta;
                        else
                            playerRotateVelocity = -Math.PI * 10 * speedDelta;
                        // console.log(angle);
                    }
                    else if (rubberduck.userData.click_Distance > 0)
                    {
                        // console.log("Dist : ", rubberduck.userData.click_Distance);

                        playerRotateVelocity = 0;
                        // new TWEEN.Tween( playerCollider.start )
                        //     .to( { x: deltax, z: deltaz }, 1 )
                        //     .easing( TWEEN.Easing.Quadratic.Out )
                        //     .start();
                        rubberduck.userData.mobile_move = 2;
                        playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ));
                    }
                    else{
                        // const time = new THREE.Vector3(deltax, 0, deltaz) / speedDelta;

                        // new TWEEN.Tween( playerCollider.start )
                        //         .to( { x: deltax, z: deltaz }, time )
                        //         .easing( TWEEN.Easing.Quadratic.Out )
                        //         .start();
                        rubberduck.userData.mobile_move = 0;
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

            function    mobile_rotate( speedDelta )
            {
                // playerRotateVelocity = Math.PI * 10 * speedDelta;
                const deltaRotate = Math.PI / 10 * speedDelta;
                headDirection.applyAxisAngle( axis,deltaRotate );
                rubberduck.rotation.y += deltaRotate;
            }

            function    mobile_controls( deltaTime )
            {
                const speedDelta = deltaTime * 10;
                const flontaxis = new THREE.Vector3(0, 0, -1);
                const camera_normaldir = getCameraDirectionVector(camera);
                let cameraangle = flontaxis.angleTo(camera_normaldir);
                const camera_cross = new THREE.Vector3().crossVectors(flontaxis, camera_normaldir);
                if (camera_cross.y < 0)
                    cameraangle *= -1;
                const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, cameraangle);
                const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
                const dir = rubberduck.userData.dest_dir.clone().applyMatrix4(rotationMatrix);
                // console.log("dest dir: ",rubberduck.userData.dest_dir);

                // console.log("dir: ",dir);
                const angle = headDirection.angleTo(dir); 
                if(angle > 0)
                {
                    const cross = new THREE.Vector3().crossVectors(headDirection, dir);
                    const isClockwise = (cross.y > 0);
                    if (isClockwise)
                        mobile_rotate( speedDelta );
                    else
                        mobile_rotate( -speedDelta );
                }
                // else{
                //     rubberduck.userData.mobile_move = 2;
                // }
                // if (rubberduck.userData.mobile_move == 2){

                    playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );
                // }
            

            }


            function animate() {

                const deltaTime = Math.min( 0.05, clock.getDelta() ) / STEPS_PER_FRAME;

			// 	// we look for collisions in substeps to mitigate the risk of
			// 	// an object traversing another too quickly for detection.

    		    for ( let i = 0; i < STEPS_PER_FRAME; i ++ ) {
                    // console.log("time :",deltaTime);
                    if (rubberduck.userData.mobile_move >= 1)
                    {
                        mobile_controls( deltaTime );
                        // mobile_move( deltaTime );
                    }
                    else
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
