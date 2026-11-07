public class S02SumSkipThreesTests
{
    [Theory(DisplayName = "S02 区間の料金")]
    [InlineData(2, 6, 11)]
    [InlineData(3, 3, 0)]
    [InlineData(0, 0, 0)]
    [InlineData(1, 2, 3)]
    [InlineData(1, 10, 37)]
    public void S02SumSkipThrees(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.S02SumSkipThrees(a, b));
    }
}
