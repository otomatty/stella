public class S04InsideTests
{
    [Theory(DisplayName = "S04 区間の内側")]
    [InlineData(5, 5, 8, "outside")]
    [InlineData(6, 5, 8, "inside")]
    [InlineData(8, 5, 8, "outside")]
    [InlineData(7, 5, 8, "inside")]
    [InlineData(0, -1, 1, "inside")]
    [InlineData(3, 3, 3, "outside")]
    public void S04Inside(int n, int l, int r, string expected)
    {
        Assert.Equal(expected, Answers.S04Inside(n, l, r));
    }
}
