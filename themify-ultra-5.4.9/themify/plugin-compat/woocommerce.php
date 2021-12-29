<?php
/**
 * Themify Compatibility Code
 *
 * @package Themify
 */

/**
 * WooCommerce
 * @link https://woocommerce.com/
 */
class Themify_Compat_woocommerce {

	static function init() {
		add_action( 'template_redirect', array( __CLASS__, 'template_redirect' ) );
		add_action( 'woocommerce_init', array( __CLASS__, 'woocommerce_init' ) );
	}

	public static function woocommerce_init() {
		remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper' );
		remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end' );
		remove_action( 'woocommerce_sidebar', 'woocommerce_get_sidebar' );
		add_action( 'woocommerce_before_main_content', 'themify_before_wrap_content', 1 );
		add_action( 'woocommerce_after_main_content', 'themify_after_wrap_content', 100 );
		if ( current_theme_supports( 'themify-sticky-buy' ) ) {
			add_action( 'template_redirect', 'themify_wc_sticky_buy', 12 );
		}
	}

	/**
	 * Fix video display in Focus Mode
	 *
	 * @access public
	 */
	public static function template_redirect() {
	    global $themify;
	    if ( $themify->page_title === 'yes' && themify_is_shop() ) {
		    add_filter( 'woocommerce_show_page_title', '__return_false', 100 );
	    }
	}
}

if ( ! function_exists( 'themify_wc_sticky_buy' ) ) :
function themify_wc_sticky_buy(){
	if ( is_product() && ! ( class_exists('Themify_Builder_Model') && Themify_Builder_Model::is_front_builder_activate() ) && ! themify_check('setting-st_add_cart', true ) ) {
		add_action( 'woocommerce_before_add_to_cart_form', 'themify_sticky_buy_observer_start' );
		add_action( 'woocommerce_after_add_to_cart_form', 'themify_sticky_buy_observer_end' );
	}
}
endif;

if ( ! function_exists( 'themify_sticky_buy_wrap' ) ) :
function themify_sticky_buy_wrap() {
	global $product;
	ob_start();
	echo '<div id="tf_sticky_buy" data-url="'.$product->get_permalink().'"></div>';
	return ob_end_flush();
}
endif;

if ( ! function_exists( 'themify_sticky_buy_observer_start' ) ) :
function themify_sticky_buy_observer_start() {
	add_action( 'woocommerce_after_single_product', 'themify_sticky_buy_wrap' );
	ob_start();
	echo '<div id="tf_sticky_form_wrap">';
	return ob_end_flush();
}
endif;

if ( ! function_exists( 'themify_sticky_buy_observer_end' ) ) :
function themify_sticky_buy_observer_end() {
	ob_start();
	echo '</div><div id="tf_sticky_buy_observer"></div>';
	return ob_end_flush();
}
endif;

if ( ! function_exists( 'themify_before_wrap_content' ) ) :
function themify_before_wrap_content() {
	if ( function_exists( 'themify_before_shop_content' ) && current_action() === 'woocommerce_before_main_content' ) {
		return;
	}
	?>
	<!-- layout -->
	<div id="layout" class="pagewidth tf_box tf_clearfix">
		<?php themify_content_before(); // Hook ?>
		<!-- content -->
		<main id="content" class="tf_box tf_clearfix">
		<?php themify_content_start(); // Hook
}
endif;

if ( ! function_exists( 'themify_after_wrap_content' ) ) :
function themify_after_wrap_content() {
	if ( function_exists( 'themify_after_shop_content' ) && current_action() === 'woocommerce_after_main_content' ) {
		return;
	}
		themify_content_end(); // Hook 
		?>
		</main>
		<!-- /#content -->
	<?php
	themify_content_after(); // Hook 
	themify_get_sidebar();
	?>
	</div><!-- /#layout -->
	<?php
}
endif;