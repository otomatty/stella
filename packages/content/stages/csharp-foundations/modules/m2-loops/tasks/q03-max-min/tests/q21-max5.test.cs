public class Q21Max5Tests
{
    [Theory(DisplayName = "Q21 5つの最大")]
    [InlineData(3, 9, 4, 11, 6, 11)]
    [InlineData(11, 3, 4, 2, 8, 11)]
    [InlineData(5, 5, 5, 5, 5, 5)]
    public void Q21Max5(int a, int b, int c, int d, int e, int expected)
    {
        Assert.Equal(expected, Answers.Q21Max5(a, b, c, d, e));
    }
}
