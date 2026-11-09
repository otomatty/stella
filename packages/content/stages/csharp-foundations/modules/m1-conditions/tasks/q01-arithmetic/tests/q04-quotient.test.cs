public class Q04QuotientTests
{
    [Theory(DisplayName = "Q04 商")]
    [InlineData(12, 5, 2)]
    [InlineData(20, 6, 3)]
    [InlineData(9, 3, 3)]
    public void Q04Quotient(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q04Quotient(a, b));
    }
}
