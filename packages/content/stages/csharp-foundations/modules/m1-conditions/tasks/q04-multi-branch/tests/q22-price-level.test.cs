public class Q22PriceLevelTests
{
    [Theory(DisplayName = "Q22 料金")]
    [InlineData(999, "cheap")]
    [InlineData(1000, "normal")]
    [InlineData(3000, "normal")]
    [InlineData(3001, "high")]
    public void Q22PriceLevel(int price, string expected)
    {
        Assert.Equal(expected, Answers.Q22PriceLevel(price));
    }
}
