public class Q19CountGreaterTests
{
    [Theory(DisplayName = "Q19 1から N のうち K より大きい個数")]
    [InlineData(10, 7, 3)]
    [InlineData(5, 10, 0)]
    [InlineData(5, 0, 5)]
    public void Q19CountGreater(int n, int k, int expected)
    {
        Assert.Equal(expected, Answers.Q19CountGreater(n, k));
    }
}
